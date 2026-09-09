# 有效秩、适应点与神经网络能力

审计基线：`4696a94becf96256efa24c7fbab0f367230aa15c`，访问日期：2026-09-09。本次只研究与编写文档，没有修改运行代码、构建应用或执行训练。源码相对路径从本目录解析；行号对应上述提交。

**核心判断：当前 `effectiveRank` 是通过结构、标量矩和手工饱和函数传播的解析代理，不是从矩阵奇异值计算的有效秩；`memoryPoint` 是游戏预算，空间 `adaptationCapability` 是另一套能力向量。两者都不能直接解释为真实网络能够记住的知识数。** 建议保留可解释的容量预算，但将结构容量、优化健康、任务匹配和计算资源拆开，先用小规模对照实验确定哪些代理有预测价值。

本文区分四类表述：`[Implemented]` 为实际源码；`[Evidence]` 为文献事实；`[Design]` 为提案；`[Unknown]` 为待校准。证据强度 `Strong` 指明确数学结论或充分支持的限定事实，`Moderate` 指相关场景实验支持，`Weak` 指有限可迁移证据，`Design heuristic` 指游戏机制或未验证近似。强度不等于实现正确性，也不意味着现实中的普适性。

## 1. Current implementation audit（当前实现审计）

### 1.1 阅读范围及文档与代码差异

已阅读 [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)、[README.md](../../README.md)、节点与 Profile 类型、前后向计算、推理聚合、知识图池接入与 UI。README 仍是 Vite 模板；PROJECT_CONTEXT 的知识图章节保留了较早机制，不能作为本提交的真值。尤其是“只有 Linear”“ReLU 每次加 1”“全组平均”和“按原阶段进入知识图”均不再准确。

| 真实链路 | 关键文件 / 函数 / 位置 | 实际作用 |
|---|---|---|
| 节点统计结构 | [ModuleBaseNodeTypes.ts:84](../../src/blueprint/neuralBlueprint/ModuleBaseNodeTypes.ts#L84)，`ModuleRankStats`、`ModuleStats`、`ModuleStatsBackward` | 保存 `outputRank/basisRank/effectiveRank/saturation/minRank`、分布矩、空间视野及两个相关性字典；没有训练权重矩阵、样本激活矩阵或奇异值数组 |
| 更新入口 | [updateState.ts:7](../../src/blueprint/neuralBlueprint/analysis/updateState.ts#L7)，`updateState` | `applyTopologyOrders → updateModuleStats → updateInferenceTopologyOrders → updateInferencePoints` |
| 结构与环 | [updateTopologyOrder.ts:7](../../src/blueprint/neuralBlueprint/analysis/updateTopologyOrder.ts#L7)，`applyTopologyOrders` | 重建运行时前驱/后继，解析双向拓扑序，标记环，过滤缺失引用 |
| 正反统计 | [updateModuleStats.ts:21](../../src/blueprint/neuralBlueprint/analysis/updateModuleStats.ts#L21)，`updateModuleStats/runForwardStats/runBackwardStats` | 拓扑排序后传播解析统计；前向无输入的非 Input 节点记 disconnected；环与无后继的非 Output 反向使用空统计 |
| 每模块公式 | [forwardModuleStats.ts:22](../../src/blueprint/neuralBlueprint/analysis/forward/forwardModuleStats.ts#L22)、[backwardModuleStats.ts:17](../../src/blueprint/neuralBlueprint/analysis/backward/backwardModuleStats.ts#L17) | 按模块 kind 分派，Output 校验完整形状；不执行真实张量网络 |
| 序与点 | [updateInferenceTopologyOrder.ts:7](../../src/blueprint/neuralBlueprint/analysis/updateInferenceTopologyOrder.ts#L7)、[updateInferencePoints.ts:16](../../src/blueprint/neuralBlueprint/analysis/updateInferencePoints.ts#L16) | 序集合传播；Linear、CNN、PatchEmbedding、ResNetStage 生成记忆点 |
| 模型与组 | [inferenceMemoryProfile.ts:44](../../src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts#L44)，`buildInferenceMemoryModels/buildInferenceMemoryProfile` | 按弱连通岛建多个模型，按完整序集合分组，汇总记忆、空间能力、方差、预训练与资源 |
| 知识图接入 | [BlueprintCanvas.tsx:100](../../src/blueprint/BlueprintCanvas.tsx#L100)、[memoryState.ts:196](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L196)，`createBlueprintPools` | 所选 Profile 进入共享 controller；原序保留在分析图，但运行池的非空阶段统一为 `[0]` |
| UI | [NeuralBlueprintNode.tsx:11](../../src/blueprint/neuralBlueprint/NeuralBlueprintNode.tsx#L11)、[InferenceMemoryChart.tsx:60](../../src/blueprint/neuralBlueprint/InferenceMemoryChart.tsx#L60) | 节点展示当前方向的 rank、sat、mean、std；图表展示组/阶段记忆、空间能力、Fσ、Bσ、F/B；这些名称容易被误解为实测 |
| 可编辑输入 | [NeuralBlueprintModuleProperties.tsx:144](../../src/blueprint/neuralBlueprint/NeuralBlueprintModuleProperties.tsx#L144)，`InputProperties` | 输入有效秩是配置值，不是数据集分析结果 |

普通节点只消费第一个前向输入，Sum 才聚合；正常 UI 在 [NeuralBlueprintCanvasInner.tsx:417](../../src/blueprint/neuralBlueprint/NeuralBlueprintCanvasInner.tsx#L417) 阻止非 Sum 多入边。因此“忽略额外输入”主要是导入/异常图的防御性风险，不能声称普通 UI 已允许多入边。

### 1.2 输入、线性层及卷积的真实公式

以下 `r` 是源码代理值，`v` 为方差、`mu` 为均值，`d_in/d_out` 为通道或特征数，均不含 batch 维。数值按配置视作无量纲；它们没有绑定真实输入单位和 loss 标度。

`forwardInputStats` 直接读取 `outFeatures` 和 `inputEffectiveRank`；`standard` 给 `(mu,v)=(0,1)`，`0-1` 给 `(0.5,1/12)`，相当于特定矩假设，并未采样用户数据。[input.ts:11](../../src/blueprint/neuralBlueprint/analysis/forward/input.ts#L11)

`forwardLinearStats` / `backwardLinearStats` 的主要计算为：

```text
r_in_used = input.effectiveRank || d_out
s_f = 1 - exp(-r_in_used / max(d_in, EPS))
r_f = d_in * s_f
outputRank_f = d_out; basisRank_f = d_in
v_f = d_in * v_W * (v_in + mu_in^2) + v_bias; mu_f = 0

r_b = d_in * (1 - exp(-r_next / max(d_in, EPS)))
v_b = d_out * v_W * (v_next + mu_next^2); mu_b = 0
v_W = 1                         [standard_normal]
v_W = 2 / (d_in + d_out)         [xavier_normal]
v_bias = 1 only if bias enabled and standard_normal, otherwise 0
```

源码：[forward/linear.ts:18](../../src/blueprint/neuralBlueprint/analysis/forward/linear.ts#L18)、[backward/linear.ts:12](../../src/blueprint/neuralBlueprint/analysis/backward/linear.ts#L12)、[utils/moduleStats.ts:79](../../src/blueprint/neuralBlueprint/analysis/forward/utils/moduleStats.ts#L79)、[constants.ts:7](../../src/blueprint/neuralBlueprint/analysis/forward/utils/constants.ts#L7)。`LINEAR_SATURATION_GAIN=1`、`EPS=1e-8`。反向经过 [boundBackwardStats](../../src/blueprint/neuralBlueprint/analysis/backward/bounds.ts#L3) 截断至 `outputRank_b=d_in`，前向 Linear 没有按 `d_out` 截断。

边界检查（从源码代数推导，尚未运行实验）：`d_in=64, d_out=1, r_in=32` 得 `r_f≈25.18`，大于输出维 1；因此这个字段连“输出表示矩阵的有效秩”都不能直接充当。`r_in=0` 又因 `||` 被替换为 `d_out`，不表示零信号保零。`minRank` 使用输入最小值与输出维取小，是另一条结构代理，不能挽救 `effectiveRank` 的上界。

CNN 与 PatchEmbedding 同样使用 `r_f=c_in*(1-exp(-r_in/c_in))`，核面积主要进入初始化方差与空间视野，没有把卷积展开矩阵真正构造出来；所以 `rank` 的对象近似为通道能力，并非完整卷积算子秩。CNN 前向 `fanIn=c_in*k^2/groups`、`fanOut=c_out*k^2/groups`；其 [backwardCNNStats](../../src/blueprint/neuralBlueprint/analysis/backward/cnn.ts#L11) 却没有除 `groups`。标准正态初始化下这会产生组数相关的前后标度不一致；Xavier 的公共比例可能抵消，不能笼统认为所有配置都差相同倍数。[forward/cnn.ts:19](../../src/blueprint/neuralBlueprint/analysis/forward/cnn.ts#L19)、[forward/patchEmbedding.ts:20](../../src/blueprint/neuralBlueprint/analysis/forward/patchEmbedding.ts#L20)、[backward/patchEmbedding.ts:10](../../src/blueprint/neuralBlueprint/analysis/backward/patchEmbedding.ts#L10)

### 1.3 非线性、归一化、池化和推理序

`distributionSketch.ts` 通过少量支持点匹配均值、方差、正负/零质量，ReLU 对支持点取 `max(x,0)`；这比只套一个高斯均值公式丰富，但仍是分布近似，不含特征间联合分布。[ensureDistributionSupport/reluDistribution](../../src/blueprint/neuralBlueprint/analysis/forward/distributionSketch.ts#L10)

```text
z_before = input.zeroRate; z_after = output.zeroRate
s_after = clamp01(s_before)^((1-z_after)/(1-z_before))
r_after = outputRank * s_after
```

这是 ReLU/Dropout/最大池化复用的非零质量转移规则；前向全非负 ReLU 直接保持输入统计。反向门 `keep=k` 用 `s_after=s_before^k`、`r_after=outputRank*s_after`，同时均值乘 `k`、二阶矩乘 `k`。[math.ts:94](../../src/blueprint/neuralBlueprint/analysis/forward/utils/math.ts#L94)、[relu.ts:15](../../src/blueprint/neuralBlueprint/analysis/forward/relu.ts#L15)、[backward/utils.ts:5](../../src/blueprint/neuralBlueprint/analysis/backward/utils.ts#L5)

这套“零越多，饱和度越高”的规则不是矩阵秩定理。尤其 [forwardDropoutStats:33](../../src/blueprint/neuralBlueprint/analysis/forward/dropout.ts#L33) 在 `p=1` 时显式设置满秩，同时分布全零；反向 `k=0` 也得到 `s^0=1`。全失活通路仍可能产正记忆点。Dropout 分布是 `m*x`，没有常见 inverted dropout 的 `1/(1-p)` 缩放，分析也未区分训练和推理开关。[dropoutDistribution:59](../../src/blueprint/neuralBlueprint/analysis/forward/distributionSketch.ts#L59)

Normalization 在正反向均把任意正方差重置为 1、均值为 0，并保持 rank；分析分派没有使用 UI 的 batch/layer 模式差别。这不是 Batch Normalization 或 Layer Normalization 的真实 Jacobian。[forward/normalization.ts:3](../../src/blueprint/neuralBlueprint/analysis/forward/normalization.ts#L3)、[backward/normalization.ts:4](../../src/blueprint/neuralBlueprint/analysis/backward/normalization.ts#L4)

平均池化采用 `v_out=v_in/n_pool` 并保持通道 rank；最大池化支持点概率用 `F(x)^n_pool` 的差分，因此暗含池内独立同分布。相邻图像像素、共享卷积特征通常不能直接视为独立，需实验验证该近似误差。Flatten 扩大 `outputRank` 至展平特征维，但保留 `effectiveRank`；Resize 保留分布矩与 rank，只变形状/视野。这些规则也是设计口径而非实测。[poolingMoments.ts:12](../../src/blueprint/neuralBlueprint/analysis/forward/poolingMoments.ts#L12)、[flatten.ts:11](../../src/blueprint/neuralBlueprint/analysis/forward/flatten.ts#L11)、[resize.ts:8](../../src/blueprint/neuralBlueprint/analysis/forward/resize.ts#L8)、[globalPooling.ts:18](../../src/blueprint/neuralBlueprint/analysis/forward/globalPooling.ts#L18)

实际推理序 `S_v` 是浮点集合：

```text
I_v = {0} if no predecessors else union(S_parent)
q = negativeRate / (1-zeroRate), clamped to [0,1]
delta_v = q*(1-q)             [ReLU; all-zero input gives 0]
delta_v = p*(1-p)             [Dropout]
delta_v = 1                   [ResNetStage]
delta_v = 0                   [other modules]
S_v = {round(s + delta_v, 3): s in I_v}; cycle gives empty set
ResNetStage.internalInferenceTopologyOrder = I_v
```

因此 ReLU/Dropout 每次最多加 `0.25`，不是一次推理步骤；ResNetStage 无论包含多少 block 均只加 `1`。这些无量纲“复杂度点”没有文献标定。[updateInferenceTopologyOrder.ts:7](../../src/blueprint/neuralBlueprint/analysis/updateInferenceTopologyOrder.ts#L7)、[math.ts:73](../../src/blueprint/neuralBlueprint/analysis/forward/utils/math.ts#L73)

### 1.4 分支、汇合、残差与不连通结构

普通 Sum 递归展开嵌套 Sum，要求输入同形。均值相加；方差按协方差恒等式的形式计算，但其中相关性是路径代理：

```text
v_sum = max(0, sum(v_i) + 2*sum_{i<j}(rho_cov_ij*sqrt(v_i*v_j)))
r_sum = sum_i(r_i*sqrt(v_i) / (sqrt(v_i)+sum_{j!=i}(rho_lin_ij*sqrt(v_j))))
```

`v_i=0` 的项跳过。`rho_cov` 和 `rho_lin` 分开保存是正确的概念区分；它们并非样本 Pearson 相关或典型相关，而是局部相关系数沿路径相乘后取最大，且裁剪到 `[0,1]`。所以不能表达负协方差、相消、正交子空间的完整结构，也没有保证所有成对系数组成半正定矩阵。`r_sum` 的前向结果不总封顶于输出维，`minRank` 的成对减重也不是可证明的秩下界。[aggregation/forward.ts:42](../../src/blueprint/neuralBlueprint/analysis/aggregation/forward.ts#L42)、[computeSumEffectiveRankByEvidence:190](../../src/blueprint/neuralBlueprint/analysis/aggregation/forward.ts#L190)、[correlation.ts:124](../../src/blueprint/neuralBlueprint/analysis/correlation.ts#L124)、[utils/sum.ts:63](../../src/blueprint/neuralBlueprint/analysis/forward/utils/sum.ts#L63)

反向多出口梯度同样求和并估计协方差，秩用类似标准差折扣式，最终统一封顶。后向 pair correlation 根据共同 sink 路径：线性相关用 `exp(-0.24*distance)`，协方差相关用途经 Linear 输出维与 ReLU/Dropout keep rate 的乘积。收集路径的 Map 每个 sink 保存一条路径，存在多路径覆盖和遍历顺序敏感的风险，不能把它说成所有路径的精确求和。[aggregation/backward.ts:9](../../src/blueprint/neuralBlueprint/analysis/aggregation/backward.ts#L9)、[backward/correlation.ts:13](../../src/blueprint/neuralBlueprint/analysis/backward/correlation.ts#L13)

ResNetStage 内部另有规则，不能用普通 Sum 公式概括：

```text
r_res = min(d_out, max(r_main,r_skip) + 0.25*min(r_main,r_skip))
v_res = v_main + v_skip + 0.5*sqrt(v_main*v_skip)
```

前向方差相当于固定相关系数 `0.25`；反向残差方差只相加，内部两次 ReLU keep 固定 `0.5`，卷积后再重置梯度方差为 1。可见“封装的 ResNetStage”和“相同结构手工展开”的统计/阶段预算未保证等价。`ResNetStage.memoryPoint` 是内部卷积 `r_f*r_b` 之和。[forward/resNetStage.ts:127](../../src/blueprint/neuralBlueprint/analysis/forward/resNetStage.ts#L127)、[backward/resNetStage.ts:12](../../src/blueprint/neuralBlueprint/analysis/backward/resNetStage.ts#L12)、[backward/resNetStage.ts:112](../../src/blueprint/neuralBlueprint/analysis/backward/resNetStage.ts#L112)

模型先按无向连接分岛，再取“所有 source 后代的并集 ∩ 所有 sink 祖先的并集”。这里 source/sink 由正/反拓扑序 0 判定，不是仅按 Input/Output kind；无 Output 的终点不会获得正常输出梯度。有效参与和预算生成还依赖有限正 `memoryPoint` 过滤。多个不连通岛分别出现在模型选择器中，不自动叠成一个巨型模型。[collectSourceSinkIntersection:622](../../src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts#L622)、[buildArrangeReachabilityMaps:29](../../src/blueprint/neuralBlueprint/utils/arrangeNodesUtils.ts#L29)

### 1.5 从节点记忆到组预算：不是相关矩阵加权

`updateInferencePoints` 对普通可训练节点设 `m_i=r_f_i*r_b_i`；注意 `r_f_i` 是模块输出代理、`r_b_i` 是传播回模块输入的代理。并非 K-FAC 所需的“层输入激活协方差 × 层输出 preactivation 梯度协方差”。

在同一精确序集合的组内，`computeGroupAggregation` 连接：(a) 直接相邻可训练节点；(b) 同为某节点直接输入的可训练节点。然后取该辅助图的连通分量。若节点属于大小 `n_c` 的分量，其 `rhoCount=n_c-1`、权重 `w_i=1/n_c`，两节点同分量 `rho=1`、否则 `0`。

```text
M_group = floor(sum_i(w_i*m_i))
        = floor(sum_components(mean(m_i in component)))
M_total = sum_groups(M_group)
```

所以串联同组层、直接汇合分支被平均；隔着非训练节点的两条同组路线可能未连接而相加。比如两条 Linear 经各自恒等 Normalization 再到 Sum，与直接两 Linear 到 Sum 的权重图可以不同，即使函数意图相同。传递连通并不证明任意两端完全冗余。小节点加入分量也可能拉低已有容量。此处 `rho` 是拓扑分组标记，不可在 UI/研究中叫“实测相关性”。[updateInferencePoints.ts:16](../../src/blueprint/neuralBlueprint/analysis/updateInferencePoints.ts#L16)、[computeGroupAggregation:679](../../src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts#L679)

组可对应多个推理序，分析图按 `M_group/|S_group|` 均分到各序；所有组再求和。`complexityCapability=max(node.inferenceTopologyOrder)`，ResNet 用内部继承序分组却用外部 `+1` 序算复杂度。因此复杂度不严格由 group ID 决定。[buildInferenceMemoryProfile:83](../../src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts#L83)、[getInferenceComplexity:290](../../src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts#L290)

### 1.6 方差汇总及其进入训练的方式

对正反方差均为有限非负值的节点重新归一化 `w_i`，记为 `a_i`：

```text
V_f = sum_i(a_i*v_f_i); V_b = sum_i(a_i*v_b_i)
F_std = sqrt(V_f); B_std = sqrt(V_b)
ratio = max(1e-12,V_f)/max(1e-12,V_b)      [both zero => 1]
L_group = sum_i(a_i*abs(log10(max(1e-12,v_f_i)/max(1e-12,v_b_i))))
learningFactor(L) = 1/(1+exp(log(99)*(L-2)))
```

单节点双零的距离特殊设 0；无有效节点时标准差/ratio/distance 为 null，而建组时 `varianceLogDistance` 回退为 0。`validWeight` 记录有效权重比例，但不进入上述 sigmoid。`L=0,1,2,3` 时因子约 `0.999898,0.99,0.5,0.01`。这是设计曲线，不是实验得出的成功率。`L_group` 是“逐点绝对对数距离的平均”，不是“平均方差之比的对数”；前者能避免大幅正负偏差相消，但仍会淡化少数严重瓶颈。[weightedVarianceSummary:497](../../src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts#L497)、[InferenceMemoryVariance.ts:14](../../src/blueprint/InferenceMemoryVariance.ts#L14)

方差不直接乘进 `memoryPoint`。它随 Profile 进入池，影响训练分配的优化因子；`optimizerVarianceLearningFactor` 对 Adam 直接返回 1，其他优化器才采用 sigmoid。不能把这解释成 Adam 在现实中能完全解决梯度消失/爆炸。[trainingSimulation.ts:330](../../src/blueprint/knowledgeGraph/model/trainingSimulation.ts#L330)

### 1.7 空间适应、距离索引与知识图接口

空间能力不是秩乘积预算的改名。`spatialView` 用源坐标追踪 `positions/jump/reach`，初始 `viewRank=1`；可训练空间操作使 `viewRank += directSupport-1`，并以感受野体积封顶。`jump'=jump*stride`，`reach'=reach+jump*(effectiveKernel-1)`。[spatialView.ts:19](../../src/blueprint/neuralBlueprint/analysis/spatialView.ts#L19)

```text
axisPoints(axis,band) = viewRank^(1/presentAxisCount)
                       * min(reach_axis/threshold_band,1)
threshold = {small:3, medium:7, large:15, extraLarge:31, global:63}
```

`reach` 和 threshold 是源像素/时间位置跨度；`viewRank` 与 axisPoints 是人为能力单位。Profile 对 CNN、PatchEmbedding、ResNetStage 的 axisPoints 乘空间分辨率匹配与相应聚合权重，逐项求和再 floor。阈值是源码明确标为 provisional 的常数，不能解释成通用物理尺度。[spatialViewAxisPoints:162](../../src/blueprint/neuralBlueprint/analysis/spatialView.ts#L162)、[SpatialAdaptationTypes.ts:26](../../src/blueprint/SpatialAdaptationTypes.ts#L26)、[weightedSpatialCapability:446](../../src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts#L446)

`distanceIndexRank.ts` 只有零初始化；已读前向路径均生成或继承这些零值，没有位置索引学习或距离推理的实现。Profile 将 short/medium/long/global 映到空间 index，height/width 对称复制，extraLarge 为 0，time index 无提供者。故 UI 出现 `idx` 字段不代表该能力已有机制。[distanceIndexRank.ts:3](../../src/blueprint/neuralBlueprint/analysis/distanceIndexRank.ts#L3)

Blueprint 的每组 `memoryPoint/adaptationCapability/complexityCapability/varianceLogDistance` 进入知识图池，但 [normalizeStages:301](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L301) 将非空阶段数组压为 `[0]`；当前游戏实际上是单阶段分配。未来恢复分阶段时，必须重新约定能力在哪一阶段可用，不能把分析图横轴直接当已实现训练深度。`samePoolConfiguration` 比较容量、方差、空间和阶段，但漏了复杂度；这是接口一致性风险，尚未复现“单次 UI 编辑且其他比较字段恰好不变”的用户路径。[memoryState.ts:269](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L269)

### 1.8 计算复杂度与稳定性

设蓝图节点数 `V`、边数 `E`、训练节点数 `T`、总组数 `G`、某 Sum 展开后输入数 `k`。单模块标量传播近似常数时间，排序为 `O(V log V)`；张量尺寸增大不会产生同等规模真实矩阵计算。普通成对聚合至少 `O(k^2)`，组 pairs 共 `O(sum_g T_g^2)`；每个组节点重新遍历辅助连通分量，最坏 `O(T_g*(T_g+E_g))`。共同源/汇递归和 Sum 展开在重复分支 DAG 中会重复走路径，不能把整个现有分析器宣称为线性时间；极端路径数可随深度指数增长。ResNet 反向每块扫描全部 internalConvs，额外约 `O(blockCount^2)`。以上为静态复杂度分析，不是测得的耗时。

数值 clamp、EPS 和 floor 能限制部分异常，却不能保证科学含义或表示等价：特别是零信号满秩、前向超过输出维、二元相关组件的结构突变、重复按组取整，以及未知统计回退到中性优化因子。

## 2. Evidence-backed findings（证据支持的结论）

### 2.1 七种“秩/维数”不能混用

对非零矩阵 `X in R^(n×d)`，奇异值 `sigma_i>=0`，`r=rank(X)`。下面均为无量纲维数；对零矩阵约定返回 0，并另标 `no_signal`，不要把熵公式的 `0/0` 悄悄变 1。

| 概念 | 定义与取值 | 可以说明什么 / 不能说明什么 | 证据 |
|---|---|---|---|
| 代数秩（algebraic rank） | 非零奇异值个数，`0..min(n,d)`；数值秩需阈值 | 给定矩阵线性独立方向；极小噪声即可使其满秩，不能直接反映稳健容量 | Strong，线性代数定义；[R01](https://www.eurasip.org/Proceedings/Eusipco/Eusipco2007/Papers/a5p-h05.pdf) 对其连续替代的讨论 |
| 有效秩（effective rank） | Roy–Vetterli：`exp(-sum p_i ln p_i)`，`p_i=sigma_i/sum sigma`，非零矩阵 `1..r` | 谱分散程度；相同非零奇异值时等于 r。改用协方差特征值等于对 X 的 `sigma_i^2` 归一化，数值不同 | Strong，2007 定义；[R01 §2.1](https://www.eurasip.org/Proceedings/Eusipco/Eusipco2007/Papers/a5p-h05.pdf)，公式另核对 [R02, 2022 §3](https://proceedings.mlr.press/v199/gauch22a/gauch22a.pdf) |
| 稳定秩（stable rank） | `norm_F(X)^2/norm_2(X)^2=sum sigma_i^2/sigma_max^2`，非零矩阵 `1..r` | 相对最大方向的能量分散；不等于熵秩，也不是“稳定可训练自由度” | Strong 定义；[R03, 2020](https://arxiv.org/abs/1906.04659) |
| 参与率（participation ratio, PR） | 对协方差 C：`tr(C)^2/tr(C^2)`，非零时 `1..rank(C)` | 能量有效维数；可不做完整 SVD 计算，是本提案诊断量，不应冒称 Roy 原定义 | Strong，公式边界由非负特征值与 Cauchy–Schwarz 直接推出 |
| 内在维数（intrinsic dimension） | 数据流形局部维数；或达到指定性能所需随机参数子空间维数 | 必须注明对象。Li 等研究的是目标函数景观的随机子空间训练维数，与表示矩阵秩不是一回事 | Moderate，2018，在论文指定任务/模型/目标性能下；[R04](https://arxiv.org/abs/1804.08838) |
| 表示秩（representation rank） | 指激活/嵌入的哪一种秩，必须另定 `X`、中心化、样本集合 | 是对象名称而非统一估计器；受输入分布和观测层影响 | Moderate，RankMe 的 JE-SSL 实验；[R05, 2023](https://proceedings.mlr.press/v202/garrido23a.html) |
| 低秩适配秩（low-rank adaptation rank） | `Delta W=B A`，`rank(Delta W)<=r_LoRA`；参数量 `r_LoRA*(d_in+d_out)` | `r_LoRA` 是受约束更新的超参数；不是激活秩、可储存事实数，也不是整网全部参数的秩 | Strong 结构事实、Moderate 场景经验；[R06, ICLR 2022](https://arxiv.org/abs/2106.09685) |

复合事实必须保留口径：`rank(XY)<=min(rank(X),rank(Y))` 适用于线性复合；非线性可在有限样本上增加表示矩阵秩，不意味着单个输入处 Jacobian 的局部维数增加。熵秩/PR 对统一非零缩放不变，但对逐特征不同缩放、中心化、加噪声与采样变化敏感。这些是上述定义的代数后果。

### 2.2 在什么对象上测量

| 对象 | 建议明确记录的定义 | 科学含义及限制 | 稠密基准成本 |
|---|---|---|---|
| 激活 `H` | `B×d`，相同 probe 样本，中心化或未中心化分开；CNN 说明 token/位置怎么采样 | 数据条件下的可区分特征方向；中心化消除常数偏置方向，`rank<=min(B-1,d)` | SVD `O(B*d*min(B,d))`；存储 `O(Bd)` |
| 权重 `W` | `d_out×d_in`；卷积需说明核展开还是完整线性算子 | 静态线性映射方向，缺数据/激活门/任务标签；卷积核矩阵秩不是全图算子秩 | SVD `O(d_in*d_out*min(d_in,d_out))` |
| 逐样本梯度 `g_b` | `B×P`；不能用整个 batch 平均梯度这个单一向量替代 | 局部任务更新方向；损失趋零会使梯度幅度很小，平均梯度抵消不代表缺容量 | 需 per-example gradient，显存 `O(BP)`，实际常用 sketch |
| 输入 Jacobian `J_x` | `d_out×d_in`，固定样本的 `df/dx` | 局部敏感度和条件数；不能代表全数据非线性表征复杂度 | 显式存储 `O(d_out*d_in)`；多次 JVP/VJP 可避免全矩阵 |
| 参数 Jacobian `J_theta` | `B*d_out×P`，指定输出 logit、损失和参数坐标 | 局部可改变的函数方向；通过 `K=J J^T` 消除部分参数冗余，但仅在该数据和训练点成立 | 显式构造成本高；固定维 sketch/迭代乘积更现实 |
| Fisher / empirical Fisher | 前者含模型预测分布的期望；后者常用数据标签的梯度外积 | 两者不一般相等；不能因都半正定就与 Hessian 互换 | 全矩阵 `O(P^2)` 存储；块近似降低成本 |
| Hessian / generalized Gauss–Newton | 明确 `d²L/dtheta²` 或 GGN；Hessian 可能有负特征值 | 曲率、局部敏感度；熵不能直接作用于带符号谱，丢负值需注明信息损失 | 显式分解 `O(P^3)`；HVP+Lanczos 可只估部分谱 |

Fisher 的区别由 [Kunstner 等, NeurIPS 2019, R07](https://arxiv.org/abs/1905.12558) 明确论证，**Strong**；K-FAC 把层间/层内统计做特定近似而降低成本，[Martens 与 Grosse, ICML 2015, R08](https://proceedings.mlr.press/v37/martens15.html)，**Strong（方法定义）/Moderate（迁移到本游戏）**。NTK 的训练动力学解释适用宽网络及相应极限/局部线性条件，[Jacot 等, 2018, R09](https://arxiv.org/abs/1806.07572)，不能无条件外推到所有有限宽、强特征学习阶段。

### 2.3 有效秩何时能、何时不能代表能力

1. **作为特征多样性诊断，有条件成立。** RankMe 在联合嵌入自监督学习（joint-embedding self-supervised learning, JE-SSL）中研究有效秩对下游表现和超参数选择的指示性。它支持“同类训练任务中可试作诊断量”，不支持“秩增加一倍，掌握知识翻倍”。[R05, 2023](https://proceedings.mlr.press/v202/garrido23a.html) **Moderate**。
2. **高秩不等于标签相关信息。** 在本研究可构造的例子中，添加独立噪声特征会提高表示谱维数，却不增加关于标签的信息；预测效用需要任务标签/目标方向。这是可证伪的建模反例，不是来源中的真实统计。[Design / 数学构造]
3. **低秩可能是成功训练后的结构。** 神经塌缩（neural collapse）研究发现，在多种图像分类网络的终末训练阶段，末层类内变异减少、类均值形成低维几何结构。不能把末层 rank 下降一概惩罚为“遗忘”。范围限定为论文研究的分类与终末训练条件。[Papyan 等, PNAS 2020, R10](https://arxiv.org/abs/2008.08186) **Moderate**。
4. **拟合随机标签与泛化需拆开。** Zhang 等在过参数化图像网络中展示随机标签也可被拟合，说明训练记忆与测试泛化不是同一个量；不能用大记忆池直接推出低 validation loss。[R11, ICLR 2017](https://arxiv.org/abs/1611.03530) **Strong（该实验现象）**。
5. **适配需求依任务和初始化而变。** LoRA 的小更新秩以及 SubGD 在特定动力系统少样本任务的低维更新子空间结果说明“少数合适方向可能足够”；它们都不证明“更高更新秩永远更好”。[R06, 2022](https://arxiv.org/abs/2106.09685)、[R02, 2022](https://proceedings.mlr.press/v199/gauch22a.html) **Moderate**。
6. **训练点、参数坐标、数据规模影响有效维数。** 有效维数可由曲率谱和正则尺度共同定义，而不是裸参数个数；Hessian 平坦度还受等价重参数化影响。[Maddox 等, 2020, R12](https://arxiv.org/abs/2003.02139)、[Dinh 等, ICML 2017, R13](https://proceedings.mlr.press/v70/dinh17b.html) **Moderate / Strong（重参数化反例）**。

还需控制 batch 大小、位置采样数、类别数、token 重复、中心化、精度阈值、优化器、训练阶段和标签噪声。对一个 batch 的 rank 饱和只能说“这次测量已被样本数截断”，不能说模型已耗尽容量。

### 2.4 方差传播支持到哪里

随机独立零均值权重下，单层 `Var(sum_j W_j*x_j)` 的二阶矩近似是可推导的；Xavier 初始化研究关注跨层激活/梯度标度与 Jacobian 奇异值，支持将方差当训练诊断，而非当记忆容量。[Glorot 与 Bengio, AISTATS 2010, R14](https://proceedings.mlr.press/v9/glorot10a.html) **Strong（限定近似）/Moderate（经验）**。

但本项目同时假设标量方差足以代表通道分布、路径相关可由结构重建、归一化能重置双向统计、汇合相关非负。训练后的权重—激活相关、强分支相关、多输出 loss 归约、BN/LN、共享参数均可能破坏这些假设。公式形式有理论亲缘关系不代表所有系数有理论依据。

尤其 `v_activation/v_gradient` 本身通常不是单位不变量：若激活单位为 `U`、loss 单位为 `L`，梯度单位为 `L/U`，其方差比单位为 `U^4/L^2`。把 loss 乘常数可改变该比值，却不改变函数表达能力。必须先统一输入、输出、loss 的归一化，再讨论比值；更好的优化指标是各自相对层内参考的增益或无量纲 Jacobian 条件统计。[Design，量纲分析；重参数化风险参见 R13]

空间 `reach` 是理论感受野跨度。Luo 等说明有效感受野的影响分布可集中于理论范围的一小部分，且受网络和训练影响；因此“覆盖 63 像素”不等于“已学会 63 像素尺度关系”。[R15, NeurIPS 2016](https://arxiv.org/abs/1701.04128) **Moderate**。

## 3. Design implications（设计含义）

**推荐：把“有效秩映射到可分配点”定为可实验检验的游戏启发式，不能当已验证的容量定律。** 文献支持测量谱和任务相关自由度，但目前没有提供“一个有效秩单位等于一个知识记忆点”的转换率。[Design heuristic]

建议后续数据契约包含四个独立量：

| 建议变量 | 单位 / 作用 | 与当前结构的关系 | 强度 |
|---|---|---|---|
| `capacityBudget` | 整数游戏点；限定能分配多少资源 | 承接 `InferenceMemoryGroup.memoryPoint`；保留来源与公式版本 | Design heuristic |
| `optimizationHealth` | `[0,1]`；影响学习速度或失败风险，不能创建/删除容量 | 替代将原始 F/B 比直接当训练规律；未知单列 | Moderate 动机、Design heuristic 映射 |
| `taskFit`、`spatialCapability` | 无量纲匹配向量；影响特定知识的效率 | 承接空间能力与 complexity；与 memory 不共用单位 | Design heuristic |
| `computeCost` | 参数数、FLOP、bytes、参考设备时间 | 已有 `trainingResources`，保持真实单位和估算声明 | Strong 单位约束、Weak 估算系数 |

同一批统计不得既增加容量、又减少需求、又增加速度而不记录作用，否则产生三重奖励；例如“更大感受野”优先作用于 taskFit，“初始化更稳定”优先作用于速度。容量预算的整数仅在对外发放时取整，内部保留浮点并守恒。[Design heuristic]

对结构聚合，建议先制定不变量：相同函数的恒等包装不能制造预算；共享权重不能重复计数；普通 Sum 不应被当成拼接；同一空间方向的能力供应可以共享，但分配记忆不能重复消费；不连通且无输出监督的参数不能提供受训容量。若游戏有意奖励深度或分支，应明示为结构加成，避免伪装成相关矩阵估计。[Design heuristic]

## 4. Candidate models/formulas（候选容量模型）

下面四套模型由简单到研究型。所有“点”转换均需校准，均不输出录用率、测试准确率或可记忆事实数。

### 4.1 A：结构容量 + 任务瓶颈（推荐首个可玩版本）

先统计具有有效输入—输出路径、未冻结、未被确定全零门阻断的**唯一参数** `P_active`。无偏置 Linear 参数 `d_in*d_out`；带偏置再加 `d_out`；组卷积参数 `k_h*k_w*c_in*c_out/groups + bias`。共享/预训练冻结参数另记，只将可更新部分计入当前适配预算。对于纯线性链，从结构得到 `d_path=min(layer widths)`；Sum 保持输出维上限，未来 Concat 按独立分支合并维数再封顶。一般非线性网络的此值仅叫结构瓶颈代理。这里主预算表示输入相关的适配能力；全零输入之后仍可训练的偏置只提供常数响应方向，应另记，不能将“无输入信号”等同“所有参数梯度必为零”。

```text
b = min(1, d_path / max(d_required,1))
C_A = floor(C_ref * b * log(1 + P_active/P_ref) / log(2))
```

`P_ref>0` 为参考模型参数数；`C_ref>0` 单位为点；`d_required>=1` 为该任务配置的目标表示维；`b∈[0,1]`。`P_active=0` 或 `d_path=0` 则 0；`P_active=P_ref,b=1` 给 `C_ref`；参数增大只有对数收益。这是预算难度曲线，**Design heuristic**，不是统计容量定理。`d_required` 缺证据时应由任务生成器明确给定，不从知识节点数量偷偷推算。

计算 `O(V+E+P_groups)`，不枚举单个参数；`P_groups` 是参数共享标识组的数量，输入/输出形状未知则返回 `unknown`。校准先验：`C_ref` 选择教程尺度的 64–256 点、`P_ref` 取任务的固定基准蓝图；这是游戏调参范围。保持固定参数基准后试验对数底或统一倍率即可，避免同时调容量、需求和训练速度导致不可辨识。该模型解释最清晰，但不能区分同参数量的好/坏特征；应由 taskFit 与实验表现表达差别。

该对数曲线边际递减但没有有限上限；若玩法需要硬上限，必须另设明确的 `C_max`，不假装它来自秩定理。A也不保证任意可训练重参数化不变：冗余线性因子会增加参数数。MVP只能可靠识别无参数恒等包装、共享参数引用等已知重复；可折叠的线性子图应作为单独规范化实验。相同当前输出不等于相同可训练函数集，不能把所有独立可训练分支都当重复而删除其容量。

### 4.2 B：固定 probe 的表示有效维数（低成本研究版）

在固定 probe 数据上得到最终目标接口激活 `H∈R^(B×d)`，要求 `B>=2`；中心化 `H_c`，`C=H_c^T H_c/(B-1)`。同时记录 Roy 熵秩及协方差 PR，并且保留对象名称，不能混称。

```text
d_PR = tr(C)^2 / tr(C*C)                    [C=0 => 0]
d_rep = min(d_PR, d, B-1)
C_B = floor(kappa * min(P_train, d_rep*d_target))
```

`d_target` 为选定输出头的独立响应维数；`P_train` 是该适配设置可训练参数数；`kappa` 单位为点/维数，按参考模型 `C_ref` 反求。这里 `C_B` 严格估计**以固定 H_c 为输入、无截距线性头的非恒定响应容量**；不是带偏置头的全部容量。若加入可训练截距，常数响应方向应另加：`C_B_total=floor(kappa*min(P_train,(d_rep+1)*d_target))`。若头实际消费未中心化 H，则必须另测常数子空间，不可用中心化PR为0就判全部头容量为0。两式都不承诺整网 fine-tuning 的总自由度；非线性整网需用 C/D 对照。定义与谱测量为 Strong；映射与外推为 **Design heuristic**；RankMe 为特定 JE-SSL 诊断提供 Moderate 支持。[R05](https://proceedings.mlr.press/v202/garrido23a.html)

若计算 `C`，时间 `O(Bd²)`、内存 `O(d²)`；若 `B<d` 可改用 `B×B` Gram 矩阵，`O(dB²)`。PR 不需完整特征分解。建议离线 probe `B=128–512`、通道 sketch 维 `64–128` 起步，这些是资源上限提案；固定采样种子和位置规则，不把同一图像的相关 token 当独立样本进行置信区间 bootstrap。

额外任务信号用固定划分的 ridge/linear probe 泛化误差单独报告，不乘成“高秩=高适配”定律。`C=0` 明确零信号；样本不足时给区间和 `sample_limited` 标志。窗口平滑建议 `EMA_beta∈[0.8,0.95]`，仅平滑同一测量定义下的连续观测；切模型、切任务应重置。

### 4.3 C：Kronecker 块的可学习方向（更贴近当前秩乘积的替代）

对一层的逐样本梯度有 `grad_W L=delta*a^T`。取含偏置的输入向量 `a_aug`，定义 `A=E[a_aug a_aug^T]`、`G=E[delta delta^T]`，K-FAC 在特定独立性/分块近似下使用 `F_layer≈A⊗G`。这是方法的限定依据，不是本项目当前实现。[R08, 2015](https://proceedings.mlr.press/v37/martens15.html)

若 `alpha_i,gamma_j` 为两因子的非负特征值，提议：

```text
d_layer(lambda) = sum_i sum_j(alpha_i*gamma_j/(alpha_i*gamma_j+lambda))
D_C = sum_unique_layers(d_layer(lambda_layer))
C_C = floor(kappa * D_C)
```

`lambda>0` 与 `alpha*gamma` 同单位，表示分辨/正则尺度；每项 `[0,1)`，`d_layer<=P_layer`，`lambda→∞` 为 0，`lambda→0+` 逼近该块秩。只有严格 Kronecker 模型才可用 `rank(A⊗G)=rank(A)*rank(G)`；entropy rank 的乘法也必须针对同一种归一化定义推导，不能把当前两个饱和代理相乘后称为该定理。

建议先将每因子按固定数据/参数规范归一化，考察 `lambda/lambda_scale∈[1e-3,1]` 的对数均匀敏感性网格；`lambda_scale` 必须写进测量快照，不能每次任意改为“让结果好看”的值。有效维数依正则尺度的思想参见 [R12, 2020](https://arxiv.org/abs/2003.02139)，本容量转换为 **Design heuristic**。

对宽度 `d_a,d_g` 的层，因子估计约 `O(B(d_a²+d_g²))`，精确特征分解 `O(d_a³+d_g³)`，存储 `O(d_a²+d_g²)`，特征值组合 `O(d_a*d_g)`。用 `q` 维 sketch 后改在 q 维处理。卷积的空间共享和相关性不能照搬全连接假设；需把 patch 样本、groups、权重共享显式纳入。

限制：块和忽略跨层冗余/耦合，中心化与否影响更新方向；若用真实标签梯度，必须标作 empirical gradient second moment，不能冒称 true Fisher。[R07](https://arxiv.org/abs/1905.12558) 梯度在最优点消失也不等于容量消失，所以建议在固定标准损失、固定 probe/checkpoint 上报告，而不是每轮缩减玩家已有记忆。

### 4.4 D：全局 Jacobian / NTK 有效维数 + 目标对齐（长期研究基准）

固定输出坐标和 probe，构造参数 Jacobian `J`，`K=J J^T/N`，`N` 为展平后的响应数。令 `K=U diag(mu) U^T`：

```text
d_K(lambda) = sum_i(mu_i/(mu_i+lambda))
alignment(lambda) = sum_i((mu_i/(mu_i+lambda))*(u_i^T e_0)^2)
                    / max(||e_0||^2, eps)
C_D = floor(kappa*d_K(lambda))
```

`e_0` 为初始目标残差；`alignment∈[0,1]` 用于解释目标方向是否可学，和容量分开展示。`lambda>0` 与 K 特征值同单位；`eps>0` 与 `norm(e_0)^2` 同单位，或先按固定输出尺度把残差无量纲化再设 eps；`d_K∈[0,min(N,P)]`，全零 K 给 0。已无残差时 alignment 标为 `already_solved`，不因分母接近零声称“不适配”。

在平方损失、固定核连续梯度流的条件下，`e(t)=U diag(exp(-mu_i*t)) U^T e_0`，此处 U 包含完整特征基，零特征值方向因 `exp(0)=1` 保留残差，显示“同样 rank、不同谱/目标投影可以学习速度不同”；这正是需要谱和任务方向的原因。[R09, 2018](https://arxiv.org/abs/1806.07572) **Strong（限定动力学）/Weak（有限宽强特征学习外推）**。这里 `t` 是与归一化后的梯度流相匹配的训练时间，不能直接当学期、epoch 或 GPU 秒。

显式存储 `O(NP+N²)`，组核约 `O(N²P)`，精确 eigendecomposition `O(N³)`；实际需 JVP/VJP 与 rank-q sketch。建议仅在小网络 `N=64–256,q=32–128` 离线作为模型比较基准。它减少层间重复计数，但仍依训练点、数据分布、参数尺度和损失；不宜直接嵌入每次拖拽交互。

### 4.5 方案比较与优化健康替代

| 方案 | 统计要求 | 可解释性 / 稳定性 | 适合用途 | 未校准参数 |
|---|---|---|---|---|
| A | 形状、连接、共享/冻结标记 | 高；不受抽样影响；任务瓶颈是假设 | 默认可玩预算、反刷分 | `C_ref/P_ref/d_required` |
| B | 固定样本激活、可选线性 probe | 中高；有样本方差和噪声方向问题 | 特征多样性、固定骨干适配 | probe协议、`kappa`、平滑 |
| C | 正确层输入/输出梯度二阶矩 | 中；需固定尺度与阻尼 | 训练方向预算候选、优化研究 | `lambda/kappa`、分块/采样 |
| D | 全局参数 Jacobian sketch、目标 | 最贴局部任务；开销高 | 小模型科学基准、检验C的冗余 | `lambda/q`、参数规范 |

建议优化健康独立使用相对参考增益：`z_f=abs(log(v_f/v_f_ref))`、`z_b=abs(log(v_b/v_b_ref))`，相同对象与单位相除；报告坏层最大值/90分位及零梯度比例。映射可采用 `H=exp(-beta*max(0,z-z_safe))∈(0,1]`，`beta∈[0.1,1]`、`z_safe∈[ln(2),ln(10)]` 作对数敏感性实验，不作为已证实阈值。这里 `v_f_ref/v_b_ref` 必须有限且严格正；测得方差为零应进入单独的缺信号诊断，不直接取 log。未知时显示区间，不回退“正常”。**Design heuristic**。单一平均 F/B 比可能让“两边一起爆炸”显示平衡，独立参考能避免该特定问题，但仍无法替代 Jacobian 条件谱。

必须区分 `grad_theta L=0` 与 `J_theta=0`：模型已经拟合、loss归约抵消、单个batch缺乏目标信号，都可能使前者为零而后者非零。只有确认固定目标接口的全部参数 Jacobian 为零、无偏置或未阻断旁路，才可将**当前局部一阶学习增益**设0；若要将结构预算也设0，还需确认是结构性阻断，而非某个检查点的暂时退化。已拟合时应标 `already_solved`，不能删除已有容量。输入 Jacobian 为零也不单独证明参数不能学习，例如输出偏置仍可改变常数响应。

## 5. Recommended MVP（推荐最小可行版本）

本节是后续设计，不是本次代码修改清单的执行结果。

1. **先统一语义。** UI 将现 `effectiveRank` 注释为“结构有效维代理”；详情显示对象为 channel proxy、输入分布假设、模型版本及 `unknown/no_signal`。`memoryPoint` 保留“游戏记忆预算”，空间能力明确按尺度/轴区分。[Strong 审计依据；Design heuristic 命名]
2. **建立边界不变量。** 输出维上界、全零门、未知形状、恒等包装、Sum 对输入排列不敏感、ResNet 封装/展开一致性、模型岛隔离、共享参数只计一次优先于增加复杂谱公式。[Strong 数学要求；Design heuristic 产品优先级]
3. **采用 A 做基线预算，B 做离线诊断。** 先在现有教程任务固定一个 `C_ref/P_ref`，不要一次性替换全部平衡曲线；用版本化的 `capacityModelId` 并列记录旧/新分数，跑通反例后再迁移存档。[Design heuristic]
4. **保留单阶段游戏的明确契约。** Profile 可继续展示浮点复杂度，分配池仍为阶段 0；另以 `complexityCapability` 表示能力门槛。恢复多阶段是单独迁移，不能悄悄改变现有池的消费规则。[Strong 审计依据]
5. **分开资源与适配。** 增宽影响 `P/FLOPs/VRAM`，稳定初始化影响速度，空间结构影响任务匹配；任何容量上升都应有计算/时间机会成本。默认不把 rank 波动转化为“立刻遗忘”，避免玩家因测量噪声丢进度。[Design heuristic]

建议的只读研究记录契约（未来可实现，当前不存在该类型）：

```ts
type CapacityMeasurement = {
  modelId: string;
  formulaVersion: string;
  object: 'structure' | 'activation' | 'gradient_block' | 'parameter_jacobian';
  estimateKind: 'analytic_proxy' | 'measured' | 'calibrated_game';
  status: 'valid' | 'unknown' | 'no_signal' | 'sample_limited';
  probeId?: string;
  checkpointId?: string;
  sampleCount?: number;
  centering?: 'none' | 'feature_mean';
  parameterConvention?: string;
  value?: number;
  interval?: [number, number];
  unit: 'dimension' | 'game_point';
  calibrationId?: string;
};
```

`value` 和 `interval` 不能把未知伪装为精确 0；`no_signal` 则是有证据的 0。游戏预算只消费 `unit='game_point'`、已标定且有效的记录。科学统计快照不可因玩家增加记忆分配而自我升高，避免用最终游戏结果“证明”容量公式。

## 6. Validation plan（最小验证实验）

### 6.1 先检验公式，再检验预测力

目前只完成源码与代数审计，未执行下列实验。未来实验脚本应独立于产品代码，数据与模型固定版本，并预登记主要指标及拒绝标准。

| 实验 | 最小网络 / 数据构造 | 记录及可证伪判断 |
|---|---|---|
| E1 零信号与上界 | 无偏置、无旁路的 Input→Linear→Dropout(p=1)→Linear→Output；另测 `64→1`、全负 ReLU、零输入及有偏置对照 | 实际激活/输入 Jacobian/逐样本梯度、旧代理、新代理。若完全阻断的输入相关方向仍正“可学习容量”或矩阵秩越界，即拒绝该解释；有偏置时单列常数方向 |
| E2 等价结构不变量 | Linear 直接分支 vs 增加恒等包装；两个 Sum 的结合顺序；共享权重 vs 独立权重；ResNet 封装 vs 显式同配置展开 | 函数输出差异、参数身份、预算差异。输出在容差内相等且训练可达函数集相同，却仅因包装预算突变，则需要重设计聚合 |
| E3 瓶颈/深度/宽度 | 纯线性、ReLU MLP，宽 `8/32/128`、深 `1/3/6`，包含窄瓶颈；同参数量对照 | 随机标签可拟合样本数、train/val loss、达到固定阈值步数。检验容量与速度能否分离 |
| E4 相同秩、不同任务 | 固定 H；标签沿主方向、微弱方向、独立噪声方向；添加与标签独立噪声特征 | rank/PR、标签对齐、线性 probe。若高 rank 只在噪声任务里升分但泛化不变，拒绝无任务条件的能力结论 |
| E5 分支相关与相消 | `x+x`、`x+(-x)`、独立随机投影支路、同权重复制支路；两输出不同 loss 权重 | 实测协方差及 Gram 谱，对照路径代理。测试非负 rho、共享 sink 代理和遍历顺序敏感性 |
| E6 方差与重参数化 | 两相邻线性/ReLU 层 `W1*c,W2/c`，`c∈{0.1,1,10}`；loss sum vs mean；标准/Xavier 初始化，SGD/Adam | 函数等价性、F/B 原比、相对增益、收敛步数；原比改变却能力不变应拒绝其容量解释；Adam是否仍失败需实测 |
| E7 空间能力 | 小 CNN / grouped/depthwise CNN / PatchEmbedding / ResNet，合成局部纹理、远距离成对关系、位置置换任务 | 正确率、源坐标梯度感受野、显存/FLOP、scale/index向量。大RF但位置任务失败说明不能将reach当索引能力 |
| E8 训练阶段与迁移 | 同模型初始化、早期、拟合后检查点；分类与少样本新任务 | 各层秩、类内/类间协方差、实际更新子空间、遗忘。若末层秩降而验证提升，拒绝单调容量惩罚 |

建议最小起步量为 E1/E2 的确定性边界构造，加 E3/E4/E6 中 12–24 个预设网络—数据组合、每组合 5 个训练种子；随后对不稳定结论扩展至 10–20 种子。**这些样本量是试验预算建议，不保证统计功效。** 必须以 pilot 方差决定后续样本量；不能把“5 个种子”当充分证据。

数据第一轮使用明确生成过程的高斯低秩回归、XOR/组合逻辑、纹理/远距离关系、独立随机标签，减少公开数据下载与算力开销。后续再采用来源可追溯的真实数据及跨任务验证；合成数据的结论只适用于构造，不外推现实论文训练规模。

### 6.2 指标、分组、检验与校准

共同记录：结构参数数/共享身份、FLOP/峰值显存、种子、batch、优化器、学习率、归约模式、输入/标签单位、train/val/test 划分；初始化与固定训练步的 `H/W/J/gradient` 谱或 sketch、零激活/零梯度率、实测与解析均值方差误差、旧 `memoryPoint`、A–D 分数、目标性能及收敛步数。

主要预测目标分三个：`memorizationThreshold`（指定训练误差阈值下可拟合样本规模）、`stepsToTarget`（达到指定验证指标的步数，未达到为删失而非随意填最大值）、`heldoutPerformance`（固定计算预算下的测试误差）。实际适配再记录迁移增益/旧任务损失。不要把这些目标合成一个未经验证的“能力真值”。

比较基线至少含参数数、宽度/深度、FLOP、激活零率、随机分数；采用**按架构家族或任务留出**，不能随机分割同一网络的邻近超参数而制造泄漏。报告 Spearman 排序相关、留出误差、区间覆盖和不同家族内结果；用按独立训练种子/原始样本分组的 bootstrap 给区间。容量模型只有在新增统计相对参数数/FLOP基线提供可重复的留出增益，且通过边界不变量，才值得进入游戏。

建议预登记的设计接受标准：在至少两个不同任务家族上，新指标的预测改善置信区间不跨 0；重要反例不出现方向性错误；结构编辑连续、解释一致。若未满足，保留 A 的明确游戏抽象并将谱诊断作为可选科研工具，不宣称“理论支持已建立”。“两个家族”是最低工程门槛，非普适统计标准。

标定 `kappa/C_ref/lambda` 时只使用训练/校准任务；最终留出任务只评估一次。对同用途系数先用宽对数先验/网格，做敏感性分析；先锚定一个基准预算和一个知识需求单位，再拟合速度系数。若容量倍率和需求倍率同时翻倍会保持结果，则两者不可从 loss 独立辨识，应固定其中之一。

## 7. Risks, unknowns, and rejected alternatives（风险、未知与拒绝方案）

| 风险 / 拒绝项 | 判断与后续动作 | 证据强度 |
|---|---|---|
| 当前 rank 当实测秩或可学习参数数 | 对象、上界和零信号行为均不支持；先改语义与边界，再验证预测 | Strong 源码与代数 |
| `r_forward*r_backward` 直接称 Fisher 秩 | 两个统计位置、估计对象和分块假设均不满足；C 才是可测试替代 | Strong 定义，Design heuristic 替代 |
| 全组均值/全组求和/最小值一刀切 | 均值会惩罚新增小分支；求和重复计算；最小值忽略并行独立输出。需要参数共享/函数接口语义 | Design heuristic、明确反例 |
| 只优化 rank 越高越好 | 噪声高秩与 neural collapse 反例；同时测任务对齐和泛化 | Moderate 文献 + 数学构造 |
| 用代数秩阈值当稳定游戏进度 | 小噪声/精度使 rank 跳变；使用连续统计与状态区间 | Strong 定义 |
| 用一个 F/B 比控制所有优化器 | 单位和 loss 归约敏感，双零/共同爆炸失真；Adam并非理论免疫 | Strong 量纲风险；后者不得作现实断言 |
| 未知统计默认为最佳 | null→0距离和单纯忽略坏层可能乐观；需要显式缺测状态 | Strong 源码 |
| 层数/门不确定性直接当推理次数 | 当前小数序是游戏复杂度；没有通用“ReLU数=知识推理步”的证据 | Design heuristic |
| 空间index已有实现的误读 | 零字段与展示不代表能力；先做位置依赖实验再引入供应者 | Strong 源码 |
| 完整 Hessian 实时评分 | 成本高、符号谱与重参数化敏感，收益未证明；只做小模型基准 | Strong 成本、Moderate 方法限制 |
| 自动生成一个“真实适配概率” | 文献没有支持统一概率；只报告情境、区间、校准版本 | Strong 证据边界 |

尚未知：当前指数饱和式是否拟合过任何真实训练数据；ResNet 的 `0.25`、空间阈值和 `viewRank` 增长规则是否有未提交的实验；训练点数与知识需求的统一标尺；多输出梯度真实相关；归一化/池化的代理误差。源码未提供这些事实的可验证来源，本文不假定它们已经被校准。

证据间的表面冲突应按范围解释：RankMe 的高秩诊断面向 JE-SSL，neural collapse 面向监督分类终末阶段；LoRA 的低秩更新不等于低秩表示；随机标签拟合不等于迁移成功。这些结果没有共同的“越高/越低都好”方向，也不应投票取平均。

## 8. Sources（本主题来源清单）

这里只列本文实际使用的来源；更广主题见 [SOURCES.md](SOURCES.md)。年份优先采用正式发表年，arXiv 年份差异另注明。访问状态是本次工具结果，不代表用户浏览器永远不可访问；未访问全文的材料不承担超出摘要/元数据的结论。

| ID | 来源、链接 | 年份 | 类型 / 范围 | 本文使用结论 | 访问状态 |
|---|---|---|---|---|---|
| R01 | Roy & Vetterli, [The Effective Rank: A Measure of Effective Dimensionality](https://www.eurasip.org/Proceedings/Eusipco/Eusipco2007/Papers/a5p-h05.pdf)；[DOI记录](https://doi.org/10.5281/zenodo.40328) | 2007 | EUSIPCO 原论文；矩阵谱维数 | 奇异值熵秩原始定义与代数秩区别 | 最终直接HTTP读取5页PDF，并核验印刷页606–607定义及性质；网页抓取仍失败、Zenodo超时；R02作交叉核验 |
| R02 | Gauch et al., [Few-Shot Learning by Dimensionality Reduction in Gradient Space](https://proceedings.mlr.press/v199/gauch22a.html)；[全文](https://proceedings.mlr.press/v199/gauch22a/gauch22a.pdf) | 2022 | CoLLAs/PMLR 原论文；特定动力系统少样本迁移 | 梯度二阶矩低维子空间、中心化选择；§3式(3)复核entropy rank定义 | 页面与PDF可读 |
| R03 | Sanyal et al., [Stable Rank Normalization for Improved Generalization in Neural Networks and GANs](https://arxiv.org/abs/1906.04659)；[正式评审记录](https://openreview.net/forum?id=H1enKkrFDB) | 2020（预印本2019） | ICLR 原论文作者版本；分类/GAN特定架构 | stable rank定义、控制秩与泛化的有条件关系 | arXiv摘要与PDF可读；OpenReview直开需浏览器验证，官方论文索引可核对年份 |
| R04 | Li et al., [Measuring the Intrinsic Dimension of Objective Landscapes](https://arxiv.org/abs/1804.08838) | 2018 | ICLR 原论文；随机参数子空间训练 | 目标景观内在维数与参数数/表示秩不同 | 作者摘要与论文入口可读 |
| R05 | Garrido et al., [RankMe](https://proceedings.mlr.press/v202/garrido23a.html) | 2023 | ICML/PMLR 原论文；JE-SSL与下游表征评价 | 秩可作限定场景诊断，不能外推统一知识容量 | 官方页面可读 |
| R06 | Hu et al., [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685)；[正式评审记录](https://openreview.net/forum?id=nZeVKeeFYf9) | 2022（预印本2021） | ICLR 原论文；预训练语言模型低秩更新 | 更新秩超参数与激活秩不同 | 作者页面可读；OpenReview直开需浏览器验证 |
| R07 | Kunstner et al., [Limitations of the Empirical Fisher Approximation for Natural Gradient Descent](https://arxiv.org/abs/1905.12558) | 2019 | NeurIPS 原论文；曲率近似分析与反例 | empirical Fisher不一般等价true Fisher/Hessian | 作者页及官方PDF索引可读 |
| R08 | Martens & Grosse, [Optimizing Neural Networks with Kronecker-factored Approximate Curvature](https://proceedings.mlr.press/v37/martens15.html)；[全文](https://proceedings.mlr.press/v37/martens15.pdf) | 2015 | ICML/PMLR 原论文；K-FAC分块近似 | 正确因子对象、Kronecker近似及成本动机 | 页面和PDF可读 |
| R09 | Jacot et al., [Neural Tangent Kernel: Convergence and Generalization in Neural Networks](https://arxiv.org/abs/1806.07572) | 2018 | NeurIPS 原论文；无限宽/核动力学 | 参数Jacobian核、谱与目标方向决定局部学习动力学 | 作者页面可读 |
| R10 | Papyan et al., [Prevalence of Neural Collapse during the Terminal Phase of Deep Learning Training](https://arxiv.org/abs/2008.08186) | 2020 | PNAS 原论文作者版本；图像分类终末阶段 | 类内变异减少、低维类几何不能直接视为能力下降 | 作者页和原文索引可读 |
| R11 | Zhang et al., [Understanding Deep Learning Requires Rethinking Generalization](https://arxiv.org/abs/1611.03530) | 2017（预印本2016） | ICLR 原论文；图像分类随机标签实验 | 训练记忆与测试泛化必须分开 | 作者页面可读 |
| R12 | Maddox et al., [Rethinking Parameter Counting in Deep Models: Effective Dimensionality Revisited](https://arxiv.org/abs/2003.02139) | 2020 | 原研究预印本；有效维数、曲率、正则化 | 维数依谱与尺度；不以裸参数数代替局部约束 | 摘要和PDF可读；本表不未经核实宣称venue |
| R13 | Dinh et al., [Sharp Minima Can Generalize For Deep Nets](https://proceedings.mlr.press/v70/dinh17b.html) | 2017 | ICML/PMLR 原论文；重参数化反例 | 曲率/平坦度并非无条件函数不变量 | 官方页面可读 |
| R14 | Glorot & Bengio, [Understanding the Difficulty of Training Deep Feedforward Neural Networks](https://proceedings.mlr.press/v9/glorot10a.html) | 2010 | AISTATS/PMLR 原论文；初始化与信号传播 | 前后向方差和Jacobian诊断动机，不支持知识点换算 | 官方页面及PDF索引可读 |
| R15 | Luo et al., [Understanding the Effective Receptive Field in Deep Convolutional Neural Networks](https://arxiv.org/abs/1701.04128) | 2016（预印本2017） | NeurIPS 原论文作者版本；CNN感受野 | 理论跨度不等于有效影响范围 | 作者页、官方PDF索引可读 |
