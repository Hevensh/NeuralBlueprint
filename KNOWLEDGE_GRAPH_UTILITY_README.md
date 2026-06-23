# Neural Blueprint → Knowledge Graph → Training Utility 全流程说明

这份文档用于让外部 GPT 或其他研究者分析当前 Knowledge Graph 的效用函数应该如何设计。

文档描述的是当前代码真实执行流程，而不是理想化方案。重点包括：

1. 神经网络蓝图如何构建。
2. 如何分析前向激活与反向梯度。
3. 如何从神经网络得到推理阶段和可用记忆预算。
4. 如何生成知识图、数据集和分阶段记忆表。
5. 知识图如何进行多阶段推理。
6. 当前 node/edge 效用如何估计。
7. 每个 training step 如何分配、转移和随机消除记忆点。
8. 当前设计中需要重点分析的问题。

---

## 1. 项目范围与技术栈

项目是一个纯前端模拟器：

- React 19
- TypeScript 6
- Vite
- `@xyflow/react`
- 无后端训练框架
- 神经网络统计、知识图推理和训练均为 TypeScript 数值模拟

主要页面：

```text
Neural Blueprint
    ↓ 生成 InferenceMemoryProfile
Knowledge Graph
    ↓ 共享 KnowledgeGraphSessionState
Training Process
```

顶层状态协调位于：

```text
src/blueprint/BlueprintCanvas.tsx
```

`BlueprintCanvas` 持有：

- 当前 tab
- 神经蓝图生成的 `InferenceMemoryProfile`
- Knowledge Graph 与 Training Process 共用的 `useBlueprintDataController`

---

## 2. 总体数据流

```text
用户构建神经网络
    ↓
重建 predecessors / successors
    ↓
计算 forward/backward topology order
    ↓
计算 inference topology order
    ↓
计算 forward ModuleStats
    ↓
计算 backward ModuleStatsBackward
    ↓
Linear.memoryPoint = forwardEffectiveRank × backwardEffectiveRank
    ↓
按 inferenceStages 对 Linear 分组
    ↓
计算每组 inferencePoint
    ↓
生成 InferenceMemoryProfile
    ↓
转换为 Knowledge Graph budgetPools
    ↓
创建 k+1 张 stage memory table
    ↓
知识图多阶段推理
    ↓
估计每个 stage 的 node utility
    ↓
基于 node utility 估计 edge utility
    ↓
按 Utility × RemainingCapacity 随机分配整数记忆点
    ↓
局部记忆转移
    ↓
随机正则化删除
    ↓
重新进入下一 training step
```

---

# Part A：神经网络蓝图

## 3. 神经网络节点结构

支持以下 module：

```ts
type ModuleBaseNodeKind =
  | 'Input'
  | 'Linear'
  | 'ReLU'
  | 'Dropout'
  | 'Sum'
  | 'Output';
```

每个节点保存：

```ts
interface ModuleBaseNodeData {
  id: string;
  kind: ModuleBaseNodeKind;
  predecessors: ModuleNodeData[];
  successors: ModuleNodeData[];

  forwardTopologyOrder?: number;
  backwardTopologyOrder?: number;
  inferenceTopologyOrder?: Set<number>;
  inCycle?: boolean;

  stats?: ModuleStats;
  statsBackward?: ModuleStatsBackward;

  memoryPoint?: number;
  inferencePoint?: number;
}
```

静态节点默认值由以下文件创建：

```text
src/blueprint/neuralBlueprint/moduleNodeFactory.ts
```

默认参数示例：

- Input output dimension：64
- Input effective rank：32
- Linear output dimension：64
- Linear initialization：Xavier normal
- Bias：zeros
- Dropout rate：0.5

---

## 4. 图连接与状态更新

React Flow edge 只保存 source/target id。

每次图发生结构或属性变化后，会执行：

```ts
updateState(nodes)
```

执行顺序：

```text
applyTopologyOrders
→ updateInferenceTopologyOrders
→ updateModuleStats
→ updateInferencePoints
```

连接引用由：

```text
src/blueprint/neuralBlueprint/utils/nodeLinks.ts
```

重建为：

```text
source.successors.push(target)
target.predecessors.push(source)
```

---

## 5. Forward / Backward topology order

文件：

```text
src/blueprint/neuralBlueprint/analysis/updateTopologyOrder.ts
```

### 5.1 Forward order

节点的 forward order 是其所有 predecessor order 的最大值加一：

```text
forwardOrder(node) =
    predecessors 为空 ? 0
    : max(forwardOrder(predecessor)) + 1
```

### 5.2 Backward order

使用 successor 进行相同计算：

```text
backwardOrder(node) =
    successors 为空 ? 0
    : max(backwardOrder(successor)) + 1
```

### 5.3 Cycle

DFS 过程中发现环时：

- 环中节点 `inCycle = true`
- topology order 设为 0
- 后续统计通常返回空统计

---

## 6. Inference topology order

文件：

```text
src/blueprint/neuralBlueprint/analysis/updateInferenceTopologyOrder.ts
```

Inference stage 不是普通网络深度。

当前规则是：只有经过 ReLU 才增加推理序。

```text
无 predecessor：
    inheritedStages = {0}

有 predecessor：
    inheritedStages = 所有 predecessor inferenceStages 的并集

当前节点 inferenceStages =
    {stage + 1 if node is ReLU else stage}
```

因此：

```text
Input → Linear → ReLU → Linear
```

可能得到：

```text
Input:  [0]
Linear: [0]
ReLU:   [1]
Linear: [1]
```

分支汇合节点可能继承多个 inference stage，例如：

```text
[0, 1, 2]
```

这表示该节点所属的记忆池可以用于这些推理序。

---

## 7. Forward ModuleStats

入口：

```text
src/blueprint/neuralBlueprint/analysis/updateModuleStats.ts
```

按 forward topology order 计算。

核心结构：

```ts
interface ModuleStats {
  rank: number;
  effectiveRank: number;
  saturation: number;
  mean: number;
  variance: number;
  zeroRate: number;
  negativeRate?: number;
  minRank?: number;

  inputElementCorr?: Record<string, number>;
  inputLinearCorr?: Record<string, number>;
}
```

含义：

- `rank`：输出维度或潜在秩。
- `effectiveRank`：实际保留的信息秩。
- `saturation = effectiveRank / rank`。
- `mean / variance`：输出分布统计。
- `zeroRate / negativeRate`：激活稀疏性。
- correlation 用于分支与 Sum 的相关性计算。

### 7.1 Linear forward

核心近似：

```text
effectiveRank =
    fanOut × (1 - exp(-gain × inputEffectiveRank / fanOut))
```

```text
variance =
    fanIn × weightVariance × (inputVariance + inputMean²)
    + biasVariance
```

Linear 同时估计输入信息相关性。

### 7.2 ReLU / Dropout

ReLU 根据输入分布估计：

- 正负概率
- zero rate
- saturation
- 信息损失

Dropout 根据 dropout rate 调整：

- 方差
- zero rate
- effective rank

### 7.3 Sum / 多输入聚合

多输入先在：

```text
analysis/aggregation/forward.ts
```

聚合。

Sum 会考虑：

- 输入 covariance
- linear correlation
- pairwise correlation
- rank composition

---

## 8. Backward ModuleStats

按 backward topology order 计算。

Output 节点从默认输出梯度开始：

```text
mean = 0
variance = 1
saturation = 1
```

其他节点聚合 successor 传回的梯度。

结构：

```ts
interface ModuleStatsBackward {
  rank: number;
  effectiveRank: number;
  saturation: number;
  mean: number;
  variance: number;
  zeroRate: number;
  negativeRate?: number;
  minRank?: number;
}
```

Linear backward 的 effective rank：

```text
effectiveRank =
    fanIn × (1 - exp(-gain × outputGradientEffectiveRank / fanIn))
```

梯度方差：

```text
variance =
    fanOut × weightVariance
    × (gradientVariance + gradientMean²)
```

分支梯度会先聚合；Sum successor 会递归展开，以减少额外包装层对相关性估计的影响。

---

## 9. Neural memory point 与 inference point

文件：

```text
src/blueprint/neuralBlueprint/analysis/updateInferencePoints.ts
```

只对 Linear 节点计算。

### 9.1 Linear memoryPoint

```text
memoryPoint_i =
    forwardEffectiveRank_i
    × backwardEffectiveRank_i
```

它表示该 Linear 同时结合前向表示容量和反向训练容量后的基础记忆规模。

### 9.2 按 inference stage set 分组

具有相同 `inferenceTopologyOrder` 的 Linear 属于同一组。

例如：

```text
Linear A: [0, 1]
Linear B: [0, 1]
Linear C: [2]
```

形成：

```text
Group "0,1": [A, B]
Group "2":   [C]
```

### 9.3 组内相关性修正

每组 inference point：

```text
inferencePoint =
floor(
  Σ_i memoryPoint_i × std_i / correlatedStd_i
)
```

其中：

```text
correlatedStd_i =
    std_i
    + Σ_(j != i) corr(i,j) × std_j
```

相关性越高，组内多个 Linear 提供的独立容量越少。

组内所有 Linear 最终保存同一个 group inferencePoint。

---

## 10. InferenceMemoryProfile

文件：

```text
src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts
```

最终契约：

```ts
interface InferenceMemoryGroup {
  id: string;
  nodeIds: string[];
  inferenceStages: number[];
  memoryPoint: number;
  ratio: number;
}

interface InferenceMemoryProfile {
  totalMemoryPoint: number;
  groups: InferenceMemoryGroup[];
  stages: InferenceMemoryStage[];
}
```

关键语义：

```text
group.inferenceStages
```

表示这组记忆预算允许投放到哪些推理序。

```text
group.memoryPoint
```

表示该预算池的总容量。

Profile 中的 `stages[].segments` 会把一个 group 的 memoryPoint 均分到其 stage 列表，主要用于图表展示：

```text
segmentMemory =
    group.memoryPoint / group.inferenceStages.length
```

但 Knowledge Graph 的真实预算系统不会预先均分这个容量。

它会创建一个总容量为 `group.memoryPoint` 的 pool，并允许该 pool 在所有 `inferenceStages` 之间竞争分配。

---

# Part B：Knowledge Graph

## 11. 静态知识图定义

结构：

```ts
interface KnowledgeGraphDefinition {
  nodes: Record<NodeId, KnowledgeNode>;
  depEdges: DependencyEdge[];
  subEdges: SubstituteEdge[];
  interEdges: InterferenceEdge[];
}
```

### 11.1 Node 固有属性

```ts
interface KnowledgeNode {
  dataAmount: number;
  requiredMemory: number;
  overfitCoefficient: number;
  lossMin: number;
  lossMax: number;
}
```

随机范围：

- dataAmount：约 `Normal(90, 10)`，限制为 1–120。
- requiredMemory：约 `Normal(30, 2)`，限制为 24–36。
- overfitCoefficient：约 `Normal(1, 0.1)`，限制为 0.7–1.3。
- lossMin：`exp(Normal(-3, 0.8))`。
- lossMax：`max(2 × lossMin, exp(Normal(3, 0.8)))`。

### 11.2 Edge 固有属性

```ts
interface KnowledgeEdgeProperties {
  requiredMemory: number;
  overfitCoefficient: number;
  lambda: number;
}
```

`lambda`：

```text
Normal(1, 0.1)，限制在 [0.7, 1.3]
```

Edge memory requirement：

- Dependency / Substitute：约 9–18。
- Interference：约 6–12。

### 11.3 Edge 类型

```text
dependency
substitute
interference
```

生成比例通过循环：

```text
dependency, substitute, dependency, interference
```

近似为：

```text
Dependency:   50%
Substitute:   25%
Interference: 25%
```

Dependency 方向按照随机拓扑顺序确定，从而避免随机 dependency 环。

---

## 12. 数据集生成

每个 dataset 选择一个中心节点，然后沿知识图邻接关系连续扩张。

基础覆盖节点数：

```text
coverageCount =
round(
  nodeCount × min(1, (1 + log(datasetCount)) / datasetCount)
)
```

每个 dataset 覆盖数额外加入：

```text
± 0.1 × nodeCount × log(datasetCount)
```

节点选择同时考虑：

- 与当前 dataset 中心的距离。
- 与全图中心的距离。
- 节点是否已被其他 dataset 覆盖。
- 当前覆盖次数。

每个被覆盖节点的数据量：

```text
Normal(90, 10)
```

启用的 dataset 按各自 train/val/test ratio 分割并累加。

训练效用和 train loss 使用 train 数量归一化权重：

```text
trainWeight_i =
    trainData_i / Σ trainData
```

---

## 13. Knowledge Graph memory state

静态图和动态记忆状态分离。

```ts
interface KnowledgeGraphMemory {
  budgetPools: KnowledgeMemoryBudgetPool[];
  stageTables: KnowledgeMemoryStageTable[];

  selectedInferenceStage: number;
  memoryProfileSource: 'preset' | 'blueprint';

  availableMemoryPoints: number;
  availableReasoningPoints: number;
}
```

### 13.1 Budget pool

```ts
interface KnowledgeMemoryBudgetPool {
  id: string;
  inferenceStages: number[];
  memoryPoint: number;
}
```

语义：

- 一个 pool 有固定总容量。
- pool 只允许把记忆点放进其 `inferenceStages`。
- pool 容量由所有允许 stage 共享。

### 13.2 Preset 模式

用户直接设置：

```text
available memory = n
reasoning points = k
```

得到一个 pool：

```text
memoryPoint = n
inferenceStages = [0, 1, ..., k]
```

### 13.3 Blueprint 模式

每个 `InferenceMemoryProfile.group` 转换成一个 pool：

```text
pool.memoryPoint = round(group.memoryPoint)
pool.inferenceStages = group.inferenceStages
```

最大 inference stage：

```text
k = max(all pool inferenceStages)
```

### 13.4 Stage table

系统创建 `k + 1` 张表：

```ts
interface KnowledgeMemoryStageTable {
  stage: number;
  allocations: Record<poolId, {
    nodes: Record<NodeId, number>;
    edges: Record<EdgeId, number>;
  }>;
}
```

每张表保存的是该 stage 新增的整数记忆点。

物理预算统计只统计真实写入各表的点数，不会因为后续推理阶段继续使用而重复计费。

---

## 14. Node 与 edge 的跨阶段语义

### 14.1 Node

Node 不直接把所有历史物理记忆相加后重新计算 mastery。

它通过上一阶段的 mastery 转换为当前阶段的 equivalent memory：

```text
equivalentMemory_i[s] =
    mastery_i[s-1] × effectiveCost_i[s]
    + nodeTableMemory_i[s]
```

然后：

```text
baseMastery_i[s] =
clamp(
  equivalentMemory_i[s] / effectiveCost_i[s],
  0,
  1
)
```

因此 node 的推理状态会跨阶段保留，但每张 node table 表示该阶段额外注入的物理记忆。

### 14.2 Edge

Edge 直接使用截至当前 stage 的累计物理记忆：

```text
edgeMemory_e[s] =
Σ_(t=0..s) edgeTableMemory_e[t]
```

```text
edgeMastery_e[s] =
clamp(
  edgeMemory_e[s] / requiredMemory_e,
  0,
  1
)
```

所以 edge 一旦在早期阶段学会，会继续影响后续阶段。

---

## 15. 多阶段知识推理

入口：

```text
src/blueprint/knowledgeGraph/model/reasoning.ts
```

每个 stage 的执行顺序：

```text
1. 计算 dependency effective cost
2. 加入当前 stage node memory
3. 计算 base mastery
4. Substitute pass
5. Interference pass
6. 保存该 stage mastery/cost/edge state
```

---

## 16. Dependency

### 16.1 Stage 0 初始成本

在所有 dependency 都没有激活时：

```text
logCost(target) =
    log(target.requiredMemory)
    + Σ incomingEdge(
        lambda_edge × logCost(source)
      )
```

```text
effectiveCost(target) = exp(logCost(target))
```

因此 dependency 链会以乘法形式扩大目标节点的初始学习成本。

### 16.2 后续 stage

Dependency activation：

```text
activation_e[s] =
clamp(
  edgeMastery_e[s]
  × sourceMastery[s],
  0,
  1
)
```

下一阶段目标成本：

```text
logCost(target)[s+1] =
    log(target.requiredMemory)
    + Σ incomingEdge(
        lambda_e
        × (1 - activation_e[s])
        × log(sourceCost[s])
      )
```

Dependency 的作用是：

- source mastery 越高，目标成本越低。
- edge mastery 越高，source 知识越能被目标使用。
- lambda 越高，未激活 dependency 的成本惩罚越大。

最后一个 stage 的 dependency 不再影响后续 stage，因为不存在 `s+1`。

---

## 17. Substitute

Substitute 在同一 stage 双向工作。

方向 `source → target` 的质量：

```text
costQuality =
clamp(
  log(1 + sourceCost)
  / log(1 + targetCost),
  0,
  1
)
```

Edge influence：

```text
edgeInfluence =
1 - (1 - edgeMastery)^lambda
```

```text
quality =
clamp(
  costQuality × edgeInfluence,
  0,
  1
)
```

多个 substitute source 使用乘积组合：

```text
substituteProduct_target =
Π_source(
  1 - clamp(quality × sourceBaseMastery)
)
```

```text
substitutedMastery_target =
1 - (1 - targetBaseMastery)
    × substituteProduct_target
```

---

## 18. Interference

Interference 在同一 stage 双向工作。

基础干扰强度：

```text
gamma =
clamp(
  1 - exp(
    -max(
      0,
      source.requiredMemory
      + target.requiredMemory
      - 24
    ) / 36
  ),
  0,
  1
)
```

Edge protection：

```text
edgeProtection =
edgeMastery^lambda
```

未被保护的 damage：

```text
damage =
clamp(
  gamma × (1 - edgeProtection),
  0,
  1
)
```

`source → target`：

```text
targetFactor *=
1 - clamp(
  damage × (1 - substitutedMastery_source),
  0,
  1
)
```

最终：

```text
finalMastery_target =
clamp(
  substitutedMastery_target × targetFactor,
  0,
  1
)
```

含义：

- 干扰源越不熟练，对目标的伤害越大。
- interference edge mastery 越高，保护越强。

---

## 19. Train 与 validation 推理

Train 模式：

- mastery 不应用 overfit 衰减。

Validation 模式：

- node/edge 超过 required memory 后应用 overfit factor。

Overfit factor：

```text
if allocatedMemory <= requiredMemory:
    factor = 1

otherwise:
    x = allocatedMemory / requiredMemory

    factor =
    sigmoid(
      3 × (
        2^(2-rho)
        - rho × (x-1)
      )
    )
```

```text
overfitPercent = (1 - factor) × 100
```

Node validation mastery 使用截至当前 stage 的累计物理记忆计算 overfit。

Edge validation mastery同样使用累计 edge memory。

---

## 20. Loss

Node train loss：

```text
x = totalAllocatedNodeMemory / finalEffectiveCost
```

```text
trainLoss =
lossMax
- trainMastery
  × (
      lossMax
      - lossMin / sqrt(x/2 + 0.5)
    )
```

Node validation loss：

```text
valLoss =
lossMax
- validationMastery
  × (lossMax - lossMin)
```

全图 loss：

```text
graphTrainLoss =
Σ_i trainWeight_i × nodeTrainLoss_i
```

```text
graphValLoss =
Σ_i valWeight_i × nodeValLoss_i
```

---

# Part C：当前效用估计

## 21. 设计目标

当前已明确不使用：

- 自动微分。
- loss gradient。
- 对每个候选记忆点完整重跑推理的有限差分。

当前目标是估计：

```text
在某 stage 给某 entity 增加一个记忆点，
预计可以带来多少 mastery growth。
```

计算顺序：

```text
先计算所有 stage 的 node utility
再使用 node utility 计算所有 edge utility
```

文件：

```text
src/blueprint/knowledgeGraph/model/utilityEstimate.ts
```

---

## 22. Node Self Growth Utility

当前 stage 增加一个 node memory point 的 mastery 增量：

```text
nodeMasteryGain =
min(
  1 - currentMastery,
  1 / effectiveCost
)
```

Self Growth：

```text
Self_i[s] =
trainWeight_i × nodeMasteryGain_i[s]
```

---

## 23. Node Adjacent Growth Utility

Node Adjacent Growth 是该节点 mastery 增量通过邻接 edge 对其他节点产生的估计收益。

### 23.1 Dependency adjacent growth

只看当前 node 作为 dependency source 的 outgoing edge。

```text
targetNeed =
trainWeight_target
× (1 - targetMastery[s+1])
```

```text
DependencyAdjacent =
nodeMasteryGain_source[s]
× targetNeed
× edgeMastery[s]
× lambda
× costQuality(source, target)
```

只在存在下一 stage 时计算。

### 23.2 Substitute adjacent growth

对每条相邻 substitute edge：

```text
SubstituteAdjacent =
nodeMasteryGain_source
× trainWeight_target
× (1 - targetMastery)
× edgeInfluence
× costQuality(source, target)
```

### 23.3 Interference adjacent growth

当前节点 mastery 增长会减少它作为干扰源造成的伤害：

```text
protection = edgeMastery^lambda
```

```text
InterferenceAdjacent =
nodeMasteryGain_source
× trainWeight_target
× targetMastery
× gamma
× (1 - protection)
```

### 23.4 Node total utility

```text
NodeUtility =
SelfGrowth
+ Σ DependencyAdjacent
+ Σ SubstituteAdjacent
+ Σ InterferenceAdjacent
```

---

## 24. Edge Utility

Edge 没有独立知识 mastery 目标，因此：

```text
Edge Self Growth = 0
```

Edge utility 全部记为 Adjacent Growth。

当前 edge mastery 增加一个 memory point 的近似：

```text
edgeMasteryGain =
min(
  1 - currentEdgeMastery,
  1 / edgeRequiredMemory
)
```

由于 edge memory 累计，这里的 `currentEdgeMastery` 使用截至当前 stage 的累计 edge memory。

### 24.1 Dependency edge utility

```text
DependencyEdgeUtility =
edgeMasteryGain
× sourceMastery[s]
× lambda
× costQuality(source, target)
× NodeUtility_target[s+1]
× (1 - targetMastery[s+1])
```

最后一个 stage 为 0。

### 24.2 Substitute edge utility

先计算 edge influence 增量：

```text
influenceGain =
influence(currentMastery + edgeMasteryGain)
- influence(currentMastery)
```

方向 `source → target`：

```text
directionUtility =
NodeUtility_target[s]
× sourceMastery[s]
× (1 - targetMastery[s])
× influenceGain
× costQuality(source, target)
```

双向相加。

### 24.3 Interference edge utility

保护增量：

```text
protectionGain =
gamma
× (
    (currentMastery + gain)^lambda
    - currentMastery^lambda
  )
```

方向 `source → target`：

```text
directionUtility =
NodeUtility_target[s]
× targetMastery[s]
× (1 - sourceMastery[s])
× protectionGain
```

双向相加。

---

## 25. Utility normalization

找到所有：

```text
stage × node
stage × edge
```

中的最大 total utility：

```text
maxUtility
```

然后统一缩放：

```text
normalizedSelf = Self / maxUtility
normalizedAdjacent = Adjacent / maxUtility
normalizedUtility = Total / maxUtility
```

因此本轮最大 utility 为 1。

这个归一化不改变全局排序，但会影响 utility 与其他后续因子的相对尺度。

---

## 26. Remaining Capacity 与最终 sampling weight

### 26.1 Node

Node capacity 使用当前 stage table memory：

```text
NodeCapacity =
max(
  0,
  1 - nodeTableMemory[s] / effectiveCost[s]
)
```

### 26.2 Edge

Edge capacity 使用截至当前 stage 的累计 memory：

```text
EdgeCapacity =
max(
  0,
  1 - cumulativeEdgeMemory[s] / edgeRequiredMemory
)
```

### 26.3 Final weight

```text
SamplingWeight =
NormalizedUtility × RemainingCapacity
```

画布预览字段：

```text
S = Self Growth
A = Adjacent Growth
U = Total Utility
C = Remaining Capacity
W = Sampling Weight
```

右栏滑块始终选择一个具体 inference stage，范围为 `0..k`。

默认选择最后一层 `k`。由于 node 推理状态延续且 edge memory 累计，最后一层代表完整推理结果。

系统不存在 `All` 或空值聚合模式。

---

# Part D：Training step

## 27. Training 配置映射

Learning fraction：

```text
learningFraction =
clamp(
  (15 + 2.5 × learningRate) / 100,
  0,
  1
)
```

Regularization fraction：

```text
regularizationFraction =
clamp(
  (20 + 2.5 × regularizationRate) / 100,
  0,
  1
)
```

默认值：

```text
learningRate = -2
→ learningFraction = 10%

regularizationRate = -4
→ regularizationFraction = 10%
```

---

## 28. 一个 training step 的完整顺序

文件：

```text
src/blueprint/knowledgeGraph/model/trainingSimulation.ts
```

### Phase 1：Inference

```text
estimate = estimateStagedMastery(graph, memory, 'train')
```

只在 step 开始时计算一次。

### Phase 2：Utility

```text
utilities = estimateUtilityReport(graph, estimate, datasetSplit)
```

同样只在 step 开始时计算一次。

本 step 后续增加/转移/删除点时，不重新计算 mastery 和 utility。

### Phase 3：按 budget pool 分配新增记忆点

每个 pool：

```text
freeMemory =
pool.memoryPoint - poolAllocatedMemory
```

```text
additions =
round(freeMemory × learningFraction)
```

候选集合：

```text
pool.inferenceStages × all nodes and edges
```

每次加入一个整数点。

随机选择概率正比于：

```text
SamplingWeight =
Utility × RemainingCapacity
```

Utility 在该 step 内固定。

RemainingCapacity 会在每次写入时根据当前 memory 重新计算，因此会动态下降。

当所有 candidate weight 为 0 时停止新增。

---

## 29. Local exploit / memory transfer

新增点后，对 pool 的每个允许 stage 执行局部转移。

文件：

```text
src/blueprint/knowledgeGraph/model/trainingExploit.ts
```

尝试次数：

```text
attempts =
round(
  当前 pool-stage 已分配点数
  × learningFraction
)
```

只允许在图上局部邻接 entity 之间转移：

```text
node ↔ adjacent edge
edge ↔ source node
edge ↔ target node
```

不会直接：

```text
node ↔ node
edge ↔ edge
```

Source 选择偏好超过 threshold 的 entity。

Target 选择权重：

```text
NeedWeight × Utility
```

每次最多转移一个整数点。

当前 transfer threshold：

- Node threshold 与 effective cost、pool ratio、stage 数量有关。
- Edge threshold 使用 required memory 按 pool ratio 和 stage 数量拆分。

这里仍然是 stage-local threshold，即使 edge 推理 mastery 已经改为累计。

---

## 30. Random regularization

当前正则化不再限制 required memory 上限。

每个已分配记忆点独立进行 Bernoulli 删除：

```text
P(delete each point) =
regularizationFraction
```

等价于：

```text
removed ~ Binomial(memory, regularizationFraction)
```

适用于：

- node
- edge
- 所有 pool
- 所有 stage

正则化在新增和局部转移之后执行。

本 step 释放的 pool 容量不会在同一个 step 再次分配，而是在下一 step 使用。

---

## 31. Loss history

每个 training step：

- 都记录 train loss。
- 每 10 epoch 计算一次 validation loss。
- 非 validation epoch 的 `valLoss = null`。

Training Process 页面只保存曲线 snapshot，不保存知识图/网络状态 snapshot。

---

# Part E：初始化与人工配置

## 32. Random initialization

初始化先清空所有 memory。

分配点数来自：

```text
Normal(
  stabilityPercent / 2,
  stabilityPercent / 20
)
```

然后：

- 按 pool 剩余容量随机选 pool。
- 在 pool 允许的 stage 中随机选 stage。
- 在所有 node/edge 中随机选 entity。
- 每次写入一个整数点。

---

## 33. Perfect allocation

Dependency depth 使用最长 incoming dependency path。

Node：

```text
stage = dependency depth
```

Dependency edge：

```text
stage = target depth - 1
```

Node 与 dependency edge 被补到 required memory。

Interference edge：

- 比较两端 node stage。
- 如果两端 stage 相同，不分配。
- 如果不同，只在较早 stage 补到 required memory。
- 因为 edge memory 现在累计，后续 stage 自动继续生效。

Substitute edge 当前不参与 perfect allocation。

---

# Part F：当前效用设计需要分析的问题

下面是希望外部 GPT 重点分析的问题。

## 34. 效用目标是否正确

当前效用直接优化 mastery growth，而 loss 只用于展示训练曲线。

需要判断：

1. 是否应该继续以 mastery growth 为主要目标？
2. 是否应乘以 `lossMax - lossMin`？
3. 是否应纳入当前 train loss？
4. 是否应区分“提高未掌握节点”和“保护已掌握节点”？

---

## 35. Self 与 Adjacent 是否存在量纲不一致

Self：

```text
trainWeight × masteryGain
```

Adjacent 包含：

- train weight
- mastery gap
- lambda
- edge mastery
- cost quality
- gamma

需要判断两者能否直接相加。

如果不能，是否需要：

```text
Utility =
alpha × Self
+ beta × Adjacent
```

以及 alpha/beta 如何自适应。

---

## 36. Node Adjacent 与 Edge Utility 是否重复计数

当前：

- Node utility 已包含该 node 经 edge 传播给邻居的价值。
- Edge utility 又使用 endpoint node utility 计算 edge 的价值。

可能出现：

- 同一传播收益被重复计入。
- edge utility 使用的 target node utility 已经包含其自己的 adjacent utility，引入额外一跳甚至隐式递归。

需要判断 edge 是否应该使用：

```text
target Self Growth
```

而不是：

```text
target Total Utility
```

---

## 37. Dependency utility 的双重 gap

Dependency edge 当前包含：

```text
nextTargetNodeUtility
× (1 - nextTargetMastery)
```

但 `nextTargetNodeUtility` 自身已经包含：

```text
nodeMasteryGain =
min(1 - mastery, 1/cost)
```

可能重复乘了 target gap。

需要判断合理公式。

---

## 38. Dependency cold start

Node dependency adjacent 需要：

```text
edgeMastery > 0
```

Dependency edge utility 需要：

```text
sourceMastery > 0
```

如果 source 与 edge 都从 0 开始：

- source 仍有 Self Growth，可以先学习。
- edge 初期 utility 仍可能为 0。

需要判断：

1. 是否应加入 exploration floor？
2. 是否应允许 dependency edge 根据 source 的潜在成长获得效用？
3. 是否应计算 source 在本 stage 加点后的预计 mastery，而不是当前 mastery？

---

## 39. Edge 累计后的 stage credit assignment

在早期 stage 给 edge 加一个点，会影响该 stage 及所有后续 stage。

但当前 edge utility 只评估：

- Dependency：当前 stage 对下一 stage 的一次作用。
- Substitute/Interference：当前 stage 的作用。

没有累加后续所有 stage 的收益。

需要设计：

```text
EdgeUtility_e[s] =
Σ_(t=s..k) futureBenefit_e[t]
```

同时避免重复计数。

这是当前最重要的问题之一。

---

## 40. Node 跨阶段 credit assignment

Node memory 通过 mastery/equivalent memory 向后续 stage 延续。

当前 Self Growth 只看当前 stage：

```text
1 / effectiveCost[s]
```

没有显式累计它在后续 stage 的持续价值。

需要判断是否应加入：

```text
futureCarryUtility
```

以及怎样以低计算量估计。

---

## 41. Global normalization

当前对所有：

```text
stage × nodes × edges
```

统一除以最大 utility。

优点：

- 最大值为 1。
- 跨 stage/pool 可比较。

问题：

- 一个极端 entity 会压缩其余全部 utility。
- 不同图规模下分布可能非常尖锐。
- normalization 后再乘 capacity，可能让 capacity 主导。

可分析替代方案：

- 按 stage normalization。
- 按 pool normalization。
- rank / softmax temperature。
- percentile clipping。
- `log1p`。
- utility moving average。

---

## 42. SamplingWeight 与 Capacity

当前：

```text
Weight = Utility × Capacity
```

Capacity 达到 0 后不会继续分配。

但训练目标已改为“提高已分配点数”，且随机正则可能持续删除。

需要判断：

1. Capacity 是否仍应作为硬上限？
2. 是否允许超出 required/effective cost？
3. 如果允许 over-allocation，如何让 overfit 和 regularization共同决定上限？
4. 是否更合理使用：

```text
Weight = Utility / (1 + allocated / target)^p
```

而不是硬截断？

---

## 43. Pool budget 与 utility 的关系

一个 budget pool 的总容量由多个 stage 共享。

当前所有允许 stage 的 entity 直接共同参与 weighted sampling。

需要判断：

- 是否应先在 stage 间分配 pool budget，再在 entity 间分配？
- 是否应使用 group 的 stage segment ratio 作为先验？
- 是否应保持自由竞争？
- 早期 stage 因能影响后续 stage，是否会天然吞噬所有预算？

---

## 44. Local exploit 与累计 edge 的不一致

Edge 推理使用累计 memory。

但 local exploit 的：

- source excess
- target need
- threshold

仍使用当前 pool-stage 的局部 memory。

需要判断是否应改为：

```text
edge cumulative memory / required memory
```

或使用：

```text
当前 stage 新增量的边际价值
```

---

## 45. 正则化

每个已分配点都可能被随机删除。

需要判断：

- 是否应按 utility 调节删除概率？
- 低 utility 点是否应更容易删除？
- edge 早期 stage 的点影响多个后续 stage，是否应更稳定？
- 是否应该让删除概率与 overfit 有关？
- 当前纯 Bernoulli deletion 是否足以形成探索？

---

# Part G：希望 GPT 给出的结果

请基于上述系统提出一个新的效用估计方法，并满足：

1. 不使用自动微分。
2. 不对每个候选点完整重跑推理。
3. 复杂度最好不超过：

```text
O((k + 1) × (|V| + |E|))
```

4. 记忆点是非负整数。
5. Budget pool 有 stage eligibility。
6. Node 状态会跨 stage 延续。
7. Edge memory 会跨 stage 累计。
8. Dependency 影响下一 stage cost。
9. Substitute/Interference 影响当前 stage mastery。
10. 希望保留可解释的：

```text
Self Growth Utility
Adjacent Growth Utility
Total Utility
```

请给出：

- 明确的数学定义。
- 每个变量的量纲。
- Node utility。
- 三类 edge utility。
- 跨阶段累计方式。
- 防止重复计数的方法。
- cold start 处理。
- normalization 方法。
- 与 capacity/overfit/regularization 的组合方法。
- pool 内实际采样算法。
- 简洁伪代码。

---

# Part H：关键代码文件

## 神经蓝图

```text
src/blueprint/neuralBlueprint/moduleNodeFactory.ts
src/blueprint/neuralBlueprint/analysis/updateState.ts
src/blueprint/neuralBlueprint/analysis/updateTopologyOrder.ts
src/blueprint/neuralBlueprint/analysis/updateInferenceTopologyOrder.ts
src/blueprint/neuralBlueprint/analysis/updateModuleStats.ts
src/blueprint/neuralBlueprint/analysis/updateInferencePoints.ts
src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts
src/blueprint/InferenceMemoryProfileTypes.ts
```

## Knowledge Graph

```text
src/blueprint/knowledgeGraph/model/types.ts
src/blueprint/knowledgeGraph/model/graphGenerator.ts
src/blueprint/knowledgeGraph/model/datasetSplit.ts
src/blueprint/knowledgeGraph/model/memoryState.ts
src/blueprint/knowledgeGraph/model/memoryOperations.ts
src/blueprint/knowledgeGraph/model/reasoning.ts
src/blueprint/knowledgeGraph/model/utilityEstimate.ts
src/blueprint/knowledgeGraph/model/trainingSignal.ts
src/blueprint/knowledgeGraph/model/trainingSimulation.ts
src/blueprint/knowledgeGraph/model/trainingExploit.ts
src/blueprint/knowledgeGraph/model/lossMetrics.ts
src/blueprint/knowledgeGraph/model/allocationStrategies.ts
```

## Controller / UI

```text
src/blueprint/BlueprintCanvas.tsx
src/blueprint/dataController/useBlueprintDataController.ts
src/blueprint/dataController/blueprintDataActions.ts
src/blueprint/knowledgeGraph/buildKnowledgeGraphElements.ts
src/blueprint/trainingProcess/
```
