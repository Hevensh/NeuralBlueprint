# 知识图正向推理与逆向推理

## Current implementation audit

本审计固定到提交 `4696a94becf96256efa24c7fbab0f367230aa15c`，核验日期为 2026-09-09。`PROJECT_CONTEXT.md` 是设计线索，README 仍是 Vite 模板；二者不能代替实现。本文的“记忆点”均为游戏资源，不是字节，也不是人的记忆容量。“掌握度”是模拟状态，不是经答题观测校准的概率。

### 1. 入口、静态类型与展示

| 层次 | 实际位置与函数 | 已实现行为 |
|---|---|---|
| 页面所有权 | [BlueprintCanvas.tsx:101](../../src/blueprint/BlueprintCanvas.tsx#L101)、`BlueprintCanvas` | 持有选定蓝图的 `inferenceMemoryProfile`，传给共享 data controller |
| 状态与评估 | [useBlueprintDataController.ts:60](../../src/blueprint/dataController/useBlueprintDataController.ts#L60)、`useBlueprintDataController` | 分别缓存 train/val reasoning、utility、loss；知识图与训练页面共享状态 |
| 模型类型 | [types.ts:33](../../src/blueprint/knowledgeGraph/model/types.ts#L33)、`KnowledgeNode`、`KnowledgeEdgeProperties`、`KnowledgeGraphMemory` | node 固有 `dataAmount, requiredMemory, adaptationRequirements, overfitCoefficient, lossMin, lossMax, color, position`；edge 有 id、源/目标节点引用、kind 及 requiredMemory/adaptationRequirements/minimumInferenceStages/overfitCoefficient/lambda |
| 生成器 | [graphGenerator.ts:54](../../src/blueprint/knowledgeGraph/model/graphGenerator.ts#L54)、`generateRandomKnowledgeGraph` | 默认 12–16 点、约 1.7N 条边；通过随机全序定向 dependency，故生成器的 dependency 是 DAG；替代和干扰运算按双向处理 |
| 默认数值 | [graphGenerator.ts:144](../../src/blueprint/knowledgeGraph/model/graphGenerator.ts#L144)、`createGeneratedKnowledgeNode`；[470](../../src/blueprint/knowledgeGraph/model/graphGenerator.ts#L470)、`createGeneratedKnowledgeEdgeProperties` | node requiredMemory 为截断正态 N(30,2²)，裁到 24–36 后取整；node dataAmount 为 N(90,10²) 裁到 1–120；dep/sub 成本 N(13.5,1.5²) 裁到 9–18，inter 为 N(9,1²) 裁到 6–12；lambda/rho 为 N(1,0.1²) 裁到 0.7–1.3。这些是游戏默认值 |
| 持久化 | [knowledgeGraphStorage.ts:13](../../src/dataStorage/knowledgeGraphStorage.ts#L13)、`loadKnowledgeGraphSession/saveKnowledgeGraphSession/toRuntimeGraph` | `knowledgeGraph:v21:`；边存节点 ID、读回再恢复引用。类型存在不等于外部输入已完成语义验证 |
| UI 映射 | [buildKnowledgeGraphElements.ts:37](../../src/blueprint/knowledgeGraph/buildKnowledgeGraphElements.ts#L37)、同名函数；[KnowledgeDetailPanel.tsx:233](../../src/blueprint/knowledgeGraph/KnowledgeDetailPanel.tsx#L233)、`NodeProperties` | allocatedMemory 展示所有阶段总物理分配；mastery/overfit 取所选阶段的 train reasoning；“effectiveMemory”标签实际显示 `effectiveRequiredMemory=effectiveCost`，即需求成本；val loss 又来自 val 分支。它不是“有效已用记忆”的统一指标 |

`adaptationRequirements` 有 time/height/width 三轴、scale/index 两路线、五个空间跨度 band，另外有非空间 `complexity`；见 [SpatialAdaptationTypes.ts:1](../../src/blueprint/SpatialAdaptationTypes.ts#L1)。其中 `time` 是输入时空轴，不是 Lab 日历时间。`minimumInferenceStages` 在 [memoryOperations.ts:119](../../src/blueprint/knowledgeGraph/model/memoryOperations.ts#L119) 被并入 complexity 下界，不是当前分阶段排程约束。

### 2. 文档与代码的重大差异

| 项目 | PROJECT_CONTEXT 中的旧描述 | 当前代码 |
|---|---|---|
| 分阶段表 | preset 为 0..reasoning；blueprint 保留阶段 | [memoryState.ts:30](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L30)、`createKnowledgeGraphMemory/configurePresetMemoryProfile` 忽略 reasoning 参数；[301](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L301)、`normalizeStages` 将非空阶段组压成 `[0]`；`setSelectedInferenceStage` 也固定 0 |
| 单阶段推理 | 未提及特殊分支 | [reasoning.ts:93](../../src/blueprint/knowledgeGraph/model/reasoning.ts#L93) 的 `lastStage===0` 先做完整关系计算，再降一次依赖成本、重算 node mastery 和关系 |
| utility | D=trainData+1，O_WEIGHT=0.1，node adjacent=0 | [utilityEstimate.ts:35](../../src/blueprint/knowledgeGraph/model/utilityEstimate.ts#L35) 为 `log1p(trainData)`、`OVERFIT_WEIGHT=0`，并增加源节点的依赖邻接需求 |
| 训练信号 | 直接读取选定阶段 | [trainingSignal.ts:16](../../src/blueprint/knowledgeGraph/model/trainingSignal.ts#L16)、`computeStageTrainingSignal` 取所有不早于该阶段的 report 中 total 最大者；正常只有阶段 0 |
| 分配 | 固定 skip=1；只用 utility | [trainingSimulation.ts:165](../../src/blueprint/knowledgeGraph/model/trainingSimulation.ts#L165) 的 skip=`1/learningFactor`，另乘节点 data priority 和池适配 factor |
| 正则 | 线性 supply、按 stage/pool 均匀删 | [trainingSimulation.ts:212](../../src/blueprint/knowledgeGraph/model/trainingSimulation.ts#L212) 用 log1p 压缩供给盈余、适配加权 target，按 slot 已分配量×优化 factor 删除 |

因此现状应称为“保留分阶段数据结构的单全局推理状态”。不得把未来重新启用阶段表写成已经可玩的能力。[01](01_EFFECTIVE_RANK_AND_ADAPTATION.md) 另审计了蓝图内部的非整数推理序；它与知识图的当前阶段 0 也不是同一变量。

### 3. Inference Memory Profile 与预算守恒

[memoryState.ts:196](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L196) `createBlueprintPools` 对每个正预算、非空阶段组建立 `blueprint:${group.id}`，保留各池 identity，记忆取非负整数，复制空间适配、复杂度与 varianceLogDistance，分配阶段统一为 0。preset 单池的空间 capability 为空、complexity=1。

令 `a[e,p,s]` 为实体 e 在池 p、阶段 s 的非负整数记忆点，`B[p]` 为池容量。读取与约束为：

```text
stageMemory[e,s] = sum_p a[e,p,s]
memoryThroughStage[e,s] = sum_(t<=s,p) a[e,p,t]
totalMemory[e] = sum_(s,p) a[e,p,s]
sum_(e,s) a[e,p,s] <= B[p]
```

[memoryOperations.ts:30](../../src/blueprint/knowledgeGraph/model/memoryOperations.ts#L30)、`readEntityStageMemory/readEntityMemoryThroughStage/readEntityTotalMemory` 按表求和；[145](../../src/blueprint/knowledgeGraph/model/memoryOperations.ts#L145) `writeEntityPoolStageMemory` 将请求 round 后截到池剩余容量。阶段共享一个池总预算，不是每阶段复制整池。手工写入逐点选择 `remainingCapacity*adaptationFactor` 最大的 slot；降容量时 [memoryState.ts:245](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L245) `fitPoolsToBudget` 按表/对象键遍历削减，非按效用最优回收。

[useBlueprintDataController.ts:209](../../src/blueprint/dataController/useBlueprintDataController.ts#L209) 的 profile 同步还检查 signature；蓝图变化可能清空分配、epoch 和 lossHistory，或初始化并施加 ResNet 预训练依赖记忆。[allocationStrategies.ts:120](../../src/blueprint/knowledgeGraph/model/allocationStrategies.ts#L120) `applyPretrainedModuleAllocation` 依 module order 与依赖深度匹配，写入对应蓝图池的阶段 0，且受池容量约束。预训练并非凭空增加预算。

### 4. 正向推理：精确公式及边界

以下均是当前游戏公式，证据类别为 **Current code**。记 `c_i>0` 为 node requiredMemory（记忆点）、`r_e>0` 为 edge requiredMemory（记忆点）、`m_i,q_e∈[0,1]` 为节点/边掌握度、`lambda_e>=0` 为无量纲关系强度。实现对需求取至少 0.001；极大 logCost 被裁到 `ln(Number.MAX_SAFE_INTEGER)`。

**初始成本**——[reasoning.ts:301](../../src/blueprint/knowledgeGraph/model/reasoning.ts#L301) `zeroActivationCosts`：

```text
log C_i^0 = log c_i + sum_(e:u->i,dependency) lambda_e log C_u^0
C_i^0 = exp(min(log C_i^0, log MAX_SAFE_INTEGER))
```

递归缓存；遇递归栈中的节点，回退到该节点 `log c_i`，不是求环上固定点。不同节点遍历顺序可产生不同缓存成本。生成器产 DAG 不代表载入/编辑后的图永不含环。

**依赖降成本**——[reasoning.ts:334](../../src/blueprint/knowledgeGraph/model/reasoning.ts#L334) `nextDependencyCosts`：

```text
activation_e[s-1] = clip(q_e[s-1] m_u[s-1],0,1)
log C_i[s] = log c_i + sum_e lambda_e(1-activation_e[s-1]) log C_u[s-1]
adjustedMemory_i[s] = m_i[s-1] C_i[s] + stageMemory_i[s]
base_i[s] = clip(adjustedMemory_i[s]/C_i[s],0,1)
edgeEquivalent_e[s] = q_e[s-1] r_e + stageMemory_e[s]
baseEdge_e[s] = clip(edgeEquivalent_e[s]/r_e,0,1)
```

stage 0 的 previous mastery=0。train 使用 base；val 乘 `1-overfit`，而 overfit 来自累计**物理**记忆。若手工恢复多阶段，val 的上一阶段折损掌握度会再次被折损；这是一种阶段相关衰减假设，不是重新观测验证集。

当前正常 `lastStage=0`：先用 `C^0` 得到一次 `m^0,q^0`，用它们调用一次 nextDependencyCosts，然后按新的 C 和同一阶段物理记忆重算 node mastery 与 relationPass；并不把第一遍 mastery 作为“上一阶段”累加，也不迭代至收敛。重复调用整个函数在输入不变时重新从零成本开始，不应写成跨 epoch 自动保留推理消息。

**替代与干扰**——[reasoning.ts:385](../../src/blueprint/knowledgeGraph/model/reasoning.ts#L385) `relationPass`、`computeEdgeInfluence/computeInterferenceGamma`：

```text
influence_e = 1-(1-q_e)^lambda_e
quality_(u->v) = clip((C_u/C_v)*influence_e,0,1)
sub_v = 1-(1-base_v) product_(sub u--v)(1-quality_(u->v)*base_u)
gamma_e = 1-exp(-max(0,c_u+c_v-24)/36)
damage_e = gamma_e*(1-q_e^lambda_e)
m_v = sub_v product_(inter u--v)(1-damage_e*(1-sub_u))
```

substitute 和 interference 均向两端施加；一次 pass 中替代只读 immutable base，干扰只读替代后的 sub，因而没有同一 pass 的就地循环放大。乘积形式类似 noisy-OR/noisy-AND，但代码没有对应事件独立性定义，不能视为校准概率。`lambda=0` 时 substitution 无影响，interference 保护为 `q^0=1`（JS 中 0^0 也为 1），于是干扰归零；与 dependency lambda=0 一样均相当于禁用关系。24/36 是记忆点尺度上的游戏常数；现实干扰没有被证明由两概念的 requiredMemory 之和决定。

**过拟合与 loss**——[lossMetrics.ts:60](../../src/blueprint/knowledgeGraph/model/lossMetrics.ts#L60)、`computeOverfitRate/computeNodeTrainLoss/computeNodeValLoss`：

```text
o(A,C,rho)=0                                     if A<=C
o(A,C,rho)=sigmoid(3*(rho*(A/(C+1e-8)-1)-2^(2-rho))) otherwise
x = adjustedMemory/C
L_train = [L_max-m_train*(L_max-L_min/sqrt(x/2+0.5))]*(1-o)
L_val = L_max-m_val*(L_max-L_min)
```

o 使用累计物理记忆 A；train loss 的 x 则使用最后阶段 adjustedMemory。C/rho/lossMin/lossMax 必须验证有限与正值；代码不同函数使用的 epsilon 不统一。A=C 右侧出现非零跃迁，例如 rho=1 时约 0.00247，rho=1.3 时约 0.0076。A 很大使 o→1，train loss→0；“过拟合导致低训练 loss”是程序规定，不是外部训练数据证明。`lossMin` 也不是严格的 train loss 下界。

[lossMetrics.ts:143](../../src/blueprint/knowledgeGraph/model/lossMetrics.ts#L143) `computeKnowledgeLossReport` 用 `(splitData_i+1)/sum_j(splitData_j+1)` 聚合。另有 [266](../../src/blueprint/knowledgeGraph/model/lossMetrics.ts#L266) `computeCapacityLoss`：设 `z=log2(B/B_opt)`，z<0 时 train/val 都加 `underScale*z²`，否则只给 val 加 `excessScale*z²`；B<=0 或无有效 B_opt 时该附加项反而为零。B 为可用容量而非已用记忆，不能拿这项定义出来的曲线验证“模型越大越过拟合”。

`computeEstimatedAccuracy` 将 mastery 映射为机会水平 `1/max(2,round(classCount))` 与 ceiling 间的 power 或归一化饱和曲线。饱和模式对图平均 mastery 再变换；power 模式先逐节点变换再平均。accuracy 不是对真实样本输出计算的命中率。

### 5. 数据、效用、分配与正则的真实闭环

[datasetSplit.ts:275](../../src/blueprint/knowledgeGraph/model/datasetSplit.ts#L275) `splitEnabledKnowledgeDatasets` 只累加 enabled 数据集；样本总数与 nodeDataAmounts 分开累计；某节点缺少配置值时回退到 node.dataAmount。evaluation/capacity profile 按节点数据总量加权；accuracyCurve 选数据量最大的 profile。因此“多个不同分类任务取平均 classCount”是现有模拟聚合，不是一个可解释的真实分类评测。

对每阶段，定义 `D_i=ln(1+max(0,trainData_i))`。当前 utility 为以下未全局归一化分数；所有负数/非有限数通常在 `positive` 中归零。

```text
Uself_i = D_i*(1-m_i)/C_i
Uadj_i  = sum_(dependency i->v) (1-m_i)*(1-m_v)*D_v
Unode_i = Uself_i+Uadj_i
need_e = lambda_e*(1-q_e)/r_e
S(u,v) = m_u*D_v*(1-m_v)*clip(C_u/C_v,0,1)
I(u,v) = gamma_e*(1-m_u)*D_v*m_v
Usub_e = [S(u,v)+S(v,u)]*need_e
Uinter_e = [I(u,v)+I(v,u)]*need_e
```

dependency edge 的 utility 不再是旧 edgeNeed 乘来源掌握度。令 `L=lambda_e*ln(max(1,C_u))`：

```text
Ccurrent = c_v*exp(L*(1-m_u*q_e))
Csaturated = c_v*exp(L*(1-m_u))
saving = clip((Ccurrent-Csaturated)/Ccurrent,0,1)
Udep_e = saving*(1-m_v)*D_v/r_e
```

见 [utilityEstimate.ts:38](../../src/blueprint/knowledgeGraph/model/utilityEstimate.ts#L38)、`estimateUtilityReport/nodeUtility/edgeUtility/dependencyCostSavingRatio`。这是一次边饱和的成本节省比例启发式，并非 1 记忆点的精确 loss 梯度；只单独看该边，未完整重跑下游关系。node adjacent 又不除成本，也不乘该边 lambda，因此 lambda=0 的 dependency 仍会提升源节点 utility。单位上 self 是“权重/记忆点”，adjacent 是“权重”；相加依赖隐含单位常数。

[trainingSimulation.ts:43](../../src/blueprint/knowledgeGraph/model/trainingSimulation.ts#L43) `runTrainingSimulation/trainOneEpoch`：

```text
f = clip((15+2.5*learningRate)/100,0,1)*learningEfficiency
F = sum_p floor(max(0,B_p-used_p)); Csum=sum_e requiredMemory_e
Lbudget = min(F,round(f*sqrt(Csum*min(F,2*Csum))))
```

Lbudget 为本 epoch 的**抽签次数预算**，不是必然添加点数。evaluation.learningEfficiency 的乘法在 clip 之后，可以>1；最终仍由 F 截断。按池剩余比例累计取整发放抽签次数，candidate 是允许阶段×全部节点和边。

```text
priority_i = (trainData_i+1)/ln(1+trainData_i)   if trainData_i>0
priority_i = 1                               otherwise
priority_edge = 1
w[e,p,s] = signal[e,s].total * priority_e * adaptationFactor[e,p]
Pr(pick e | one draw in p) = w[e,p,s]/(1/learningFactor[p]+sum w)
Pr(skip) = (1/learningFactor[p])/(1/learningFactor[p]+sum w)
```

节点 self 分数中的 logData 被 priority 抵消，最终接近 `(data+1)*(1-m)/C`；node adjacent 也被**源节点** priority 放大；边没有该乘数。故只看 UI utility 无法还原训练抽签概率。零 trainData 节点自身 self=0，但作为有数据目标的前置仍可获邻接权重。训练一整个 epoch 固定使用起点 utility，不随每点分配刷新。

`learningFactor` 对 Adam 恒为 1，对 SGD 是 `1/(1+exp(ln(99)*(distance-2)))`，distance 为前反向方差 log10 比值绝对值。见 [trainingSimulation.ts:353](../../src/blueprint/knowledgeGraph/model/trainingSimulation.ts#L353) 与 [InferenceMemoryVariance.ts:40](../../src/blueprint/InferenceMemoryVariance.ts#L40)。这不是 Adam 优化器的矩估计实现；它只改变抽签 skip 和正则删除权重。`trainingExploit.ts` 不在这条训练调用链上。

适配由 [adaptation.ts:71](../../src/blueprint/knowledgeGraph/model/adaptation.ts#L71) `computeAdaptationBalance` 计算。对有正要求的空间格及 complexity，`r=clip(capability/requirement,0.01,2)`，`g=max(0,-log2 r)`，`s=max(0,log2 r)`：

```text
factor = 2^[-0.75*max(g)-0.25*weightedMean(g)
             +log2(1.1)*(0.5*max(s)+0.5*weightedMean(s))]
```

平均按 requirement 加权；无需求为1；全格缺失约0.01，全格两倍约1.1。当前只是改变学习机会和正则保留量，读出的物理 memory 不乘此系数；因此“有效记忆点=物理记忆×factor”不是当前实现。

正则在学习之后每 epoch 执行：

```text
supply = B_total/Csum
lower = max(0,0.7-0.1*regularizationRate)*(1+0.12*ln(1+max(0,supply-1)))
factorBar_e = sum_p (B_p/B_total)*factor[e,p]
target_e = round(c_e * Uniform(lower,1.5*lower) * factorBar_e)
remove_e = max(0,totalMemory_e-target_e)
Pr(delete slot[p,s]) proportional to a[e,p,s]*learningFactor[p]
```

`regularizationRate=0` 仍执行随机削除；rate>=7 时 lower=0，target=0，形成清空吸收行为。factorBar 按**容量占比**，不是实际分配占比；新增空池也会改变正则目标。弱 SGD factor 池在正则中反而较少被删。删除以点为单位多次遍历 slot，不是梯度 weight decay。

每 epoch 记录 train loss，epoch%10=0 才把 val loss 写入历史，否则为 null；UI controller 另算实时 val，所以实时面板与曲线不必同频。历史 null 不可当成0，也不可拿插值点当实测值。

手工初始化约 `round(min(B,Csum)*max(0,Normal(0.05,0.01²)))` 点，池按剩余容量选、阶段均匀、实体按适配加权。[allocationStrategies.ts:48](../../src/blueprint/knowledgeGraph/model/allocationStrategies.ts#L48) `perfectAllocation` 按依赖深度填节点/依赖边至 base requiredMemory，不填 substitute；正常 stage=0 使 interference 两端阶段相同，所以全被跳过。它不是全局最优 loss 分配器；`transferAllocation` 再清节点，保留这批边。

### 6. 复杂度与可复现性

令 N 为节点、E 为全部边、Q=N+E、P 为池数、S 为阶段数（当前 S=1）、A/R 为当次尝试添加/实际删除点数、D 为依赖深度。复杂度指现有实现的遍历，不把每次 record 求和假设为 O(1)。

| 操作 | 时间/空间与限制 |
|---|---|
| 推理 | 邻接表且缓存时理想 O(S(N+E)+S²PQ)；累计 stageMemory 重读引入 S²；递归复制 visiting Set 另可达 O((N+E)D)，构造 incoming 数组亦有高入度复制开销。当前 S=1，大约 O(PQ+E+(N+E)D)；阶段报告空间 O(SQ) |
| utility | O(SQ)，不含图/数据生成；信号每 candidate 扫后续 stages，使一般情形再有 S |
| 逐点训练 | A 次 weightedPick 重新为 PS 选择集算权重；单池查找适配池 O(P)，故保守 O(A*S*Q*(P+S))；每点 write 又扫描该池所有实体/阶段 O(SQ) |
| 正则 | target 统计 O(QPS)；R 次重新枚举 PS slot，删除 write 扫 O(SQ)，约 O(R*S*(P+Q)) |
| 初始化/手工 | 逐点分配与排序/重新求容量，非仅 O(Q)；大记忆预算的帧耗时风险 |

训练 PRNG 的 state 被保存和返回；相同种子之外仍需固定图键顺序、池顺序、数据/profile revision、UI 控件和步数，才可重放。初始化 seed 为空时用 Math.random。分析阶段不运行应用或构建；以上复杂度为代码推导，不是已测性能。

## Evidence-backed findings

证据强度约定：**Strong**=定义/定理/明确官方规则或直接代码核验；**Moderate**=限定数据与假设下有实验支持；**Weak**=跨域外推、缺代表性数据；**Design heuristic**=游戏设计选择。Strong 不表示可以把教育或认知研究直接移植为神经网络容量机制。

| 方法 | 原始/权威证据与年份、范围 | 可回答的“逆推” | 本项目限制与强度 |
|---|---|---|---|
| 后向链推理（backward chaining）/前置追踪（prerequisite tracing） | Poole & Mackworth 2023，命题 Horn 规则的查询和证明 [K01](https://artint.info/3e/html/ArtInt3e.Ch5.S3.html) | 为指定目标找必要前提、AND/OR 证明树 | Strong（逻辑语义）；把 graded mastery 当真假阈值是 Design heuristic。当前 dependency 是可降低成本的软关系，不自动等于逻辑必要条件 |
| 溯因推理（abductive reasoning） | Poole & Mackworth 2023，最小一致解释 [K02](https://artint.info/3e/html/ArtInt3e.Ch5.S8.html) | 给定错误观测，提出缺前置、关系混淆、观测噪声等解释 | Strong（定义），无观测/故障模型就不能做诊断；未掌握目标不逻辑蕴含未掌握所有前置 |
| 贝叶斯网络（Bayesian networks）/概率图模型（PGM） | Poole & Mackworth 2023，变量消元 [K03](https://www.cs.ubc.ca/~poole/aibook/3e/html/ArtInt3e.Ch9.S5.html) | 以似然和先验反求 latent mastery posterior | Strong（条件概率运算）；复杂度受 induced width 控制，二值变量为 O(N*2^(w+1))，不是一般线性；当前 lambda 不是 CPT |
| 信念传播（belief propagation） | Murphy/Weiss/Jordan，UAI 1999，四类网络实验 [K04](https://www.cs.ubc.ca/~murphyk/papers/loopy_uai99.pdf) | 在因子图交换证据消息 | 树上 exact，含环可能振荡或收敛至错误边缘分布；Moderate（该实验）。damping 不保证正确性 |
| 贝叶斯知识追踪（BKT） | Corbett & Anderson 1995，编程辅导中的技能习得 [K05](https://link.springer.com/article/10.1007/BF01099821) | 从连续正确/错误更新隐含掌握状态 | Moderate；需要猜测/失误/学习概率，不能直接把 memory/cost 当后验；出版者可读摘要，全文访问可能受限 |
| 深度知识追踪（DKT） | Piech et al. NeurIPS 2015，教育答题序列 [K06](https://papers.neurips.cc/paper_files/paper/2015/file/bac9162b47c56fc8a4d2a519803d51b3-Paper.pdf)；Khajah et al. 2016 的重新比较 [K07](https://arxiv.org/abs/1604.02416) | 序列下一题表现预测 | Moderate；早期 DKT 优势受基线增强影响，预测指标不证明因果 prerequisite；冷启动游戏没有足够序列，MVP不推荐 |
| 项目反应理论（item response theory, IRT） | Chen et al. 2021 预印本，心理测量统计框架 [K08](https://arxiv.org/abs/2108.08604) | 区分学习者能力与题目难度 | Strong（模型定义）/Moderate（应用）；需锚题、局部独立与尺度约束；单题答错不是单一知识缺失证明 |
| 课程学习（curriculum learning） | Bengio et al. ICML 2009 [K09](https://icml.cc/Conferences/2009/papers/119.pdf)；Graves et al. ICML 2017 的三组 LSTM 课程 [K10](https://proceedings.mlr.press/v70/graves17a.html) | 选择学习顺序、按学习进展调度 | Moderate；有益课程依任务，非越简单越好、越深越晚的普遍定律 |
| 最近发展区（zone of proximal development, ZPD） | Vygotsky 1978，儿童发展、成人/同伴协助下表现 [K11](https://doi.org/10.2307/j.ctvjf9vz4) | 为导师提示与适度挑战提供概念依据 | Weak（向研究生/模型训练外推）；不提供通用70%成功率或固定mastery阈值。原著目录/出版信息可访问，全文依权限 |
| 因果前置发现（causal prerequisite discovery） | Peters et al. JMLR 2014，加性噪声 DAG 的可识别假设 [K12](https://www.jmlr.org/beta/papers/v15/peters14a.html)；Roy et al. 2018/2019 PREREQ 教育资源监督关系推断 [K13](https://arxiv.org/abs/1811.12640) | 实验上识别学A是否提高学B收益 | 因果定义Strong，当前可用证据Weak。文本/课程顺序监督边与干预因果边应分开 |
| 逆向规划（inverse planning） | Baker/Saxe/Tenenbaum，Cognition 2009，简化迷宫行为判断实验 [K14](https://web.mit.edu/9.s915/www/classes/cognition2009.pdf) | 从已观察的选择反推意图/信念 | Moderate（原实验）/Weak（Lab外推）；从目标向前置找路属于规划，不能仅因“逆向”就称inverse planning |
| 图神经网络消息传播（GNN message passing） | Gilmer et al. ICML 2017，分子性质预测的 MPNN [K15](https://proceedings.mlr.press/v70/gilmer17a.html) | 学习图上局部聚合器、预测收益 | Moderate（分子领域）；无监督标签时不优于可解释手写规则，反向边不是反向因果 |

这些文献支持“追踪、诊断、规划、资源优化是不同问题”。没有来源直接验证当前记忆成本连乘、24/36干扰函数、正则随机削除或 Adam 消除全部方差惩罚。这些机制应统一标记 **Design heuristic**，其有效性依后文实验检验。

## Design implications

### 1. 将四种逆推目标拆开

| 输出 | 输入 | 是否修改 mastery/物理记忆 | 推荐 |
|---|---|---|---|
| 缺口解释 `GapExplanation` | 固定 forward snapshot、目标、显式规则 | 否 | MVP 必做；给出哪些关系/节点限制目标，以及未知项 |
| 学习路径 `LearningPlan` | 缺口、可选动作、前置 AND/OR、资源/期限 | 否 | MVP 做前2–3个动作及备选路线 |
| 难度/收益预测 `ActionEstimate` | 成本、可用能力、历史学习进展/观测 | 否 | 输出区间及假设，不显示伪造精确成功率 |
| 记忆重分配 `AllocationProposal` | 当前预算、动作收益、正则约束 | 只生成提案；应用一次才写 | MVP 小步、预算守恒；诊断本身不得增加记忆 |

建议证据为 **Design heuristic**，拆分的必要性由 K01/K02/K03 的语义差异支持。还需将玩家知识追踪 `LearnerBelief` 与蓝图模型训练 `ModelMasterySnapshot` 分开：模型训练结果不能自动证明玩家已经学会对应概念。

### 2. 兼容原有边，而不偷换语义

保留 dependency=有方向的软学习成本影响、substitute=可迁移/替代收益、interference=需辨析的混淆损害。新增 `PrerequisiteRule` 表示真正课程约束，`relationEvidence` 记录 authored/observed/interventional 与适用数据域。只对经过作者确认的边映射为硬前置；迁移时默认旧 dependency 为 soft。

AND 表示同一路线的多必需条件；OR 表示可选完整路线；不要把一串普通边默认当 OR。substitute 只能以有方向、范围有限的 route 成为备选；当前对称计算不证明真实知识可完全互换。interference 不作为“反向前置”；建立辨析练习动作，评估其削弱 damage 的收益。

### 3. 数据结构草案（建议新增，不是现有文件）

```ts
type PrerequisiteRule = {
  id: string; targetId: string;
  alternatives: Array<{ id: string; required: Array<{
    nodeId: string; edgeId?: string; threshold: number;
  }> }>;
  enforcement: 'soft' | 'hard'; confidence?: number;
  provenance: 'authored' | 'observed' | 'interventional';
};
type ReasoningSnapshot = {
  graphRevision: string; profileRevision: string; allocationRevision: string;
  mode: 'train'|'val'; modelVersion: string;
  nodes: Record<string,{mastery:number; effectiveCost:number; overfit:number}>;
  edges: Record<string,{mastery:number; overfit:number}>;
};
type ReversePlan = {
  basedOn: ReasoningSnapshot;
  goals: Array<{nodeId:string; targetMastery:number; weight:number}>;
  gaps: Array<{entityId:string; magnitude:number; reasons:string[]}>;
  alternatives: Array<{actionIds:string[]; costPoints:number; timeMinutes:number}>;
  unknowns:string[]; cycleGroups:string[][];
};
```

现有阶段表接口保留，但 MVP allocator 使用 stage=0。需要恢复真实推理深度时，单独增加 `inferenceRound`（无量纲算法迭代）、`learningEpoch`（训练更新）、`gameMinute`（资源时间），不要复用 stage 一个字段承载三者。

## Candidate models/formulas

下表是候选 **Design heuristic**，只有明确指向 BKT/IRT 的概率方程来自相应模型定义；游戏参数范围是待校准搜索空间。

### A. 有界成本 + 确定性前置追踪（推荐MVP）

先给成本一个单位一致的备选，不立即替换产品：

```text
d_i = weightedMean_(incoming dependency e:u->i)(1-m_u*q_e; weight=lambda_e)
C_i = c_i*(1+alpha*d_i)
```

无前置或 lambda 总和0时 d=0。`c_i`、`C_i` 单位均为记忆点；m/q/d∈[0,1]，alpha∈[0,3] 为设计搜索范围，因此 `c_i<=C_i<=(1+alpha)c_i`。一次给定 snapshot 计算 O(N+E)；没有 log 有单位量、不受成本整体换单位影响。代价：取平均可能稀释真正必须掌握的多个前置；硬 AND 必须由规则阈值控制，不能只用均值代替。

前置条件 k 的 readiness `r_k=clip(m_k*q_edge,0,1)`，无 edge 则 q=1；缺口 `g_k=max(0,threshold_k-r_k)`。AND 路线的 readiness 可用 `min_k(r_k/threshold_k)` 截到1（非概率），OR 选择总未满足成本最低且可达的一条完整路线，并显示其他路线。threshold 建议扫0.5–0.9，不声称教育普适标准；threshold=0的条件直接满足。对多个目标按 entityId 去重，不能为共享前置重复付费。

### B. 目标收益的小步有限差分（兼容现有 forward）

以固定 val evaluator 定义设计目标（与真实验证集区分）：

```text
J(a)=sum_i omega_i*max(0,target_i-m_i(a)) + eta*sum_i omega_i*overfit_i(a)
gain(action) = [J(a)-J(a+delta_action)] / costPoints(action)
score = gain/(1+timeMinutes/t_ref)
```

`sum omega=1`，eta∈[0,1]，J/gain 的单位分别为无量纲、1/记忆点；delta=1–4点，t_ref=30–120分钟均为待测参数。不存在资源的动作剔除；所有 gain<=0 则停止并报告“当前候选无可见收益”，不能强迫学习。每次仅对前 K=8–32 个候选以同一 frozen snapshot 试算；复杂度 O(K*T_forward)，空间 O(QP+KQ)。若要模拟正则，将同一随机样本用于所有候选，否则差分主要测随机噪声。

局限：依赖边与前置节点可能互补，单点看无收益但成对有收益。因此候选同时保留“前置节点+关系”两步动作和小额探索预算；不能宣称贪心是全局最优。迁移任务中的高 overfit 可要求重分配或辨析练习而不是无限加点。

### C. 观察驱动的 BKT/IRT 诊断（第二阶段）

对真实玩家练习而不是模型模拟 loss，令 `p=P(learned)`，失误概率 slip、猜测 guess、学习转移 learn 均在[0,1]。一次正确观测 y=1时：

```text
p_post = p*(1-slip) / [p*(1-slip)+(1-p)*guess]
p_next = p_post+(1-p_post)*learn
```

错误观测用 `p*slip/[p*slip+(1-p)*(1-guess)]`。这是 BKT 基本结构 [K05]；零分母报告不可识别并保留 prior。每个已标注技能每次观测 O(1)。多技能题须显式观测因子，不能复制同一个答案独立更新每个技能后宣称独立证据。无数据可从 Beta(1,1) 的宽先验开始并通过约束使 `guess<1-slip`；先验是设计选择，不是人口统计。

IRT 二参数形式 `P(y=1)=sigmoid(a_j*(theta-b_j))`：a>0为区分度，theta/b 为同一任意能力标尺；需固定 theta 均值0方差1或锚定题目，解决平移/缩放不可识别 [K08]。不在MVP同时拟合所有BKT/IRT参数；先固定题目、记录来源与重复测量，并在用户/题目分组留出集检查校准。

### D. 带不确定性的反向图消息（长期研究）

若只是传播**目标重要性**，可定义 `z^(t+1)=(1-beta)*goal+beta*P_rev*z^t`，P_rev 为非负行随机反向邻接矩阵，beta∈[0,1)，无出边行设为自环。其无穷范数收缩系数<=beta，所以误差按 beta^t 衰减；T轮 O(T(N+E))。beta可扫0.3–0.8，停止阈值1e-4、最多20轮是计算预算建议，未达阈值需标记。

z 是需求优先级，不是 mastery、因果效应或 Bayesian posterior。此方法抑制循环放大但仍会重复传播相关路径，故用作候选检索，不据其数值直接发记忆点。真实 posterior 应转成显式因子图（K03/K04）；GNN 只能在有校准数据、外部泛化验证后替代局部收益近似（K15）。

## Recommended MVP

推荐组合为 **A 的规则追踪 + B 的小步前向验证**，初期对现有 forward 做只读调用；成本替代式以离线实验比较，不随逆推功能一起暗改。算法输出解释、2–3个推荐动作、估计区间和预算效果。

```text
planReverse(graph, rules, memory, goals, resources):
  validate IDs, finite values, revisions and pool budgets
  snapshot = forward(graph, memory, mode='val')
  components = SCC(dependency and explicit prerequisite references)
  mark cyclic components; condense to DAG for external tracing
  selectedRoutes = choose feasible AND/OR routes using snapshot and frozen costs
  demand = goal gaps
  for component in reverse topological order from goals:
    if cyclic: emit joint-study/diagnostic action; do not invent internal order
    for target in component:
      collect unmet prerequisites of selected route
      union reasons by (entityId,goalId); aggregate magnitude with max
      propagate discounted demand to prerequisite components
  candidates = deduplicated node-study, edge-study, paired study,
               discrimination, optional transfer actions
  remove actions violating hard rules, pool capacity or time/resource limits
  shortlist K candidates; always keep paired candidate for a blocked goal
  for candidate in shortlist:
    allocate delta in a copy; preserve sum allocation <= each pool budget
    result = forward(graph, candidateMemory, 'val')
    record goal gap change, overfit change, time and affected explanations
  return best positive-gain actions, route alternatives and unknowns

applyChosenAction(plan, currentState):
  require revisions equal plan.basedOn
  debit resources and commit exactly one allocation delta
  record one manual-allocation event; do not also call ordinary training
  recompute one forward snapshot; invalidate plan
```

结构追踪 O(N+E+规则条件数)，保存完整多目标 provenance 最坏 O(G(N+E))，候选排序 O(Q log Q)，验证 O(K*T_forward)。AND/OR 图最优共享子目标规划可能需要组合搜索；MVP 只作局部路线选择，输出“启发式计划”，不伪称线性求出了最优学习路径。限制 alternatives 每目标<=3、K<=32 是交互预算；更大图按 SCC 子图分页。

环处理不能简单忽略：对严格前置环，若无已满足入口就是不可启动规则，要求作者修正或允许一项 bootstrapping 活动；对软互补环，输出联合学习动作并做固定轮数验证。冲突由单独 constraints/diagnostic 记录，不拿 interference 边当逻辑否定。mastery 未知时保留 unknown 或区间，不能默认为0后诊断“确定缺失”。

上面的MVP是一次手工分配动作，评估和应用都只写同一delta；常规训练及其正则是另一个动作，不额外跟随手工分配执行。若未来候选表示完整训练epoch，应在试算中包含相同训练/正则转移并固定随机数，应用时只执行该转移一次，不先写delta再重复训练。

正向只按知识关系计算状态，逆向只传播目标需求；逆推结果不写回 forward mastery。学习事件才改变物理资源，之后重新 forward。此分离既保留方向，又阻止“解释→掌握→解释”的自我强化。对UI建议将 `effectiveMemory` 改为“当前学习成本”，展示“物理已用记忆/适配效率/目标缺口”三项；这是未来变更建议，本任务未改代码。

## Validation plan

以下均为拟议实验，尚未执行。需要隔离“游戏系统内部一致性”“人类学习预测”“真实网络学习预测”，不能用本模型产生标签再验证本模型。

| 实验 | 操作、对照、记录 | 可证伪判断 |
|---|---|---|
| 顺序与图同构 | 单链、菱形共享前置、双环、孤点、重复sub；固定状态重排节点/边/池键 | 语义同图的结果差异>浮点容差应定位；现有环回退预期可能失败，作为证据而非掩盖 |
| 单位缩放 | 将全部记忆/需求/预算同时×10，比较 mastery与动作排名；alpha有界成本作对照 | 除整数粒度效应外应不变；旧log成本乘法的差异可证伪单位独立性 |
| 退化边 | lambda=0、q=0/1、m=0/1、0数据、0预算；删除与lambda=0比较 | 禁用dependency仍改变node utility应明确作为当前语义问题；NaN/Infinity不得悄然变成高收益 |
| 全局最优基线 | 3–6节点、20–40点预算枚举可行分配；比较当前perfect、随机、utility、逆推+差分 | 比较目标差距、预算/时间、重复seed分布；不要求贪心总赢，但拒绝长期比随机差的候选模型 |
| 多前置与替代 | A AND B 与 A OR B、共享A、多目标、无可行路径 | AND不因满足一项解锁；OR不重复收费；已完成的目标不反复投资；不可达有明确原因 |
| 循环与重复计数 | 增加同义节点或复制同一替代证据，循环运行planner但不apply | 预算/mastery严格不变；复制内容不得提高目标证据可信度 |
| 方差/优化器/正则消融 | current vs同skip vs统一删除；固定随机数比较学习曲线 | 检验SGD弱池是否被异常保留，rate=0/7边界是否符合预期游戏规则；报告模拟结果 |
| 实际教育校准 | 经同意收集带技能标签练习；随机分配前置练习/等时对照，按学习者留出 | A练习是否提高B后测增益而非仅相关；BKT/IRT看log loss、Brier、可靠性曲线，与简单近期正确率比较 |
| 交互性能 | Q=30/100/1000，P=1/8/32，A/R扫10–10000，K=8/32 | 用p50/p95耗时和内存确定上限；p95<100ms是桌面交互目标假设，超出则批处理/worker，不虚报已测 |

最小统计方案：先至少20个模拟随机种子给 bootstrap 区间与个体轨迹；真实用户研究先做方差估计和功效分析，不能把20当足够样本。参数选择与评估集分开，阈值事先登记。未来模块应在实验报告保存所有seed、版本、图、控件和 null 验证点。

## Risks, unknowns, and rejected alternatives

1. **当前尺度风险（Strong：代码推导）**：单位有问题的log成本连乘，深链饱和、c<1时依赖可能减而非增成本；node self/adjacent不一致；未归一化utility与skip导致节点数/数据量改变实际训练速度。优先做缩放和lambda=0实验。
2. **状态同步风险（Strong：接口核验；用户可见触发待复现）**：[memoryState.ts:269](../../src/blueprint/knowledgeGraph/model/memoryState.ts#L269) `samePoolConfiguration` 比 memory/variance/空间签名/stages，却未比 complexityCapability。ResNet group复杂度可能不由group.id唯一决定；须做“其他字段相同，只改complexity”的接口回归测试，不能直接声称已复现完整UI故障。
3. **训练与评估混合（Strong：代码）**：val 是同一游戏方程另一分支；data profile指定的最优容量和accuracy ceiling会把预期趋势写入结果。用它们调试交互可以，用来证明有效秩具有科学预测力不可以。
4. **拒绝仅按深度分层**：看不见替代、多目标共享、关系未掌握和资源限制；并与当前stage=0不符。
5. **拒绝把边反转后再跑原推理**：dependency方向承载成本语义，转向不是Bayes反演，会制造因果错误。
6. **拒绝默认无限loopy BP/GNN**：缺似然、数据和收敛依据；阻尼只能改善数值行为，不能补充缺失语义（K04/K15）。
7. **拒绝 mastery直接等同概率**：若后续做知识追踪，应另存观测、posterior和校准状态；该建议Strong（概率语义）/Design heuristic（接口）。
8. **未知参数**：alpha、阈值、需求折扣、utility与时间交换率、正则强度、学习进展窗口均需实验；先宽范围敏感性分析，不提供伪精确现实概率。

## Sources

| ID | 来源、链接 | 年份 / 类型 | 使用结论与适用范围 / 访问情况 |
|---|---|---|---|
| K01 | Poole & Mackworth, [Propositional Definite Clauses](https://artint.info/3e/html/ArtInt3e.Ch5.S3.html) | 2023 / 剑桥教材作者公开版 | 正向/后向链、Horn AND规则、证明；公开全文，非概率掌握模型 |
| K02 | Poole & Mackworth, [Abduction](https://artint.info/3e/html/ArtInt3e.Ch5.S8.html) | 2023 / 教材作者公开版 | 一致最小解释与诊断；公开全文 |
| K03 | Poole & Mackworth, [Exact Probabilistic Inference](https://www.cs.ubc.ca/~poole/aibook/3e/html/ArtInt3e.Ch9.S5.html) | 2023 / 教材作者公开版 | 贝叶斯因子分解、变量消元、treewidth；公开全文 |
| K04 | Murphy, Weiss & Jordan, [Loopy Belief Propagation for Approximate Inference](https://www.cs.ubc.ca/~murphyk/papers/loopy_uai99.pdf) | 1999 / UAI原始论文、作者修正版 | 含环推理可能振荡/错误；四类网络，公开PDF |
| K05 | Corbett & Anderson, [Knowledge tracing: Modeling the acquisition of procedural knowledge](https://link.springer.com/article/10.1007/BF01099821) | 1995 / 同行评审论文 | 编程辅导BKT、观测误差与学习状态；摘要可读，全文可能需订阅；卷号4造成部分索引标1994，采用出版页1995 |
| K06 | Piech et al., [Deep Knowledge Tracing](https://papers.neurips.cc/paper_files/paper/2015/file/bac9162b47c56fc8a4d2a519803d51b3-Paper.pdf) | 2015 / NeurIPS原始论文 | 答题序列RNN预测；公开PDF，不证明因果课程边 |
| K07 | Khajah, Lindsey & Mozer, [How deep is knowledge tracing?](https://arxiv.org/abs/1604.02416) | 2016 / 作者预印本 | 增强BKT基线与DKT比较；范围限定其数据/设置，公开 |
| K08 | Chen et al., [Item Response Theory—A Statistical Framework](https://arxiv.org/abs/2108.08604) | 2021 / 作者综述预印本 | IRT能力/题目、识别约束与观测建模；公开，不作项目参数来源 |
| K09 | Bengio et al., [Curriculum Learning](https://icml.cc/Conferences/2009/papers/119.pdf) | 2009 / ICML原始论文 | 课程顺序的任务依赖作用；公开PDF |
| K10 | Graves et al., [Automated Curriculum Learning for Neural Networks](https://proceedings.mlr.press/v70/graves17a.html) | 2017 / ICML原始论文 | 学习进展与非平稳bandit；三类LSTM课程，公开 |
| K11 | Vygotsky, [Mind in Society](https://doi.org/10.2307/j.ctvjf9vz4) | 1978 / Harvard University Press原著 | ZPD原始发展心理学语境；出版/目录可访问，全文依权限；无游戏阈值证据 |
| K12 | Peters et al., [Causal Discovery with Continuous Additive Noise Models](https://www.jmlr.org/beta/papers/v15/peters14a.html) | 2014 / JMLR原始论文 | 观测因果识别依赖假设；连续加性噪声DAG，公开 |
| K13 | Roy, Madhyastha, Lawrence & Rajan, [Inferring Concept Prerequisite Relations from Online Educational Resources](https://arxiv.org/abs/1811.12640) | 2018初稿/2019修订与IAAI录用 / 作者预印本 | 课程/概念标签推断prerequisite；不等于干预因果效应，公开 |
| K14 | Baker, Saxe & Tenenbaum, [Action understanding as inverse planning](https://web.mit.edu/9.s915/www/classes/cognition2009.pdf) | 2009 / Cognition原始论文、MIT副本 | 简化行动观察中的意图反推；公开PDF，不能直接量化科研行为 |
| K15 | Gilmer et al., [Neural Message Passing for Quantum Chemistry](https://proceedings.mlr.press/v70/gilmer17a.html) | 2017 / ICML原始论文 | MPNN计算框架，原实验证据限分子预测；公开 |

全部外部来源核验日期 2026-09-09；来源汇总与跨主题约束见 [SOURCES.md](SOURCES.md)。
