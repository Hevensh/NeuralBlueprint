# NeuralBlueprint Project Context

## Project Stack

- Vite + React + TypeScript.
- Main canvas library: `@xyflow/react`.
- App entry: `src/App.tsx`.
- Global style entry: `src/style.css`.

## Current Source Layout

```text
src/
├─ App.tsx
├─ main.tsx
├─ style.css
├─ canvas.css
├─ buttons.css
├─ modules.css
├─ dataStorage/
├─ desktop/
└─ blueprint/
```

## Desktop Area

Desktop files live in:

```text
src/desktop/
├─ DesktopCanvas.tsx
├─ DesktopCanvasInner.tsx
├─ DesktopIconNode.tsx
├─ desktopTypes.ts
├─ desktop.css
├─ fileNames.ts
├─ leftPanel.tsx
└─ rightPanel.tsx
```

### Desktop Responsibilities

`DesktopCanvas.tsx` is the outer shell:

- Owns `selectedFile`.
- Owns `saveNotice`.
- Owns `historyRef` for undo.
- Owns the current React Flow `canvas` instance.
- Saves current desktop state before opening a file.
- Handles file rename, file delete, undo, and fit view.

`DesktopCanvasInner.tsx` owns React Flow node behavior:

- Builds desktop nodes.
- Owns React Flow nodes state via `useNodesState`.
- Handles drag-and-drop file creation.
- Handles node click, node drag start, pane click, and node double click.
- Saves files and viewport on a delayed timer.

Node data is intentionally small:

```ts
export interface DesktopIconData extends Record<string, unknown> {
  file: DesktopFile;
}
```

Do not store callback functions such as `onOpenFile` in node data. Opening files is handled through React Flow:

```tsx
onNodeDoubleClick={(_, node) => onOpenFile(node.data.file)}
```

This avoids stale closures when returning to the desktop after opening and closing a file.

### Desktop File Model

```ts
export type DesktopFileType = 'nbp' | 'rep';

export interface DesktopFile {
  id: string;
  name: string;
  type: DesktopFileType;
  deletable: boolean;
  position: {
    x: number;
    y: number;
  };
}
```

`name` is stored without a file extension. `type` carries the file type.

Default desktop files are defined in `src/dataStorage/desktopStorage.ts`:

- `Experimental Blueprint`
- `Experimental Report`

Both default files use `deletable: false`. Drag-created files use `deletable: true`.

### Desktop Interactions

- Left panel title: `Available Files`.
- Left panel can drag-create:
  - `Blueprint`
  - `Report`
- Left panel has a `Center View` button.
- Right panel shows the selected file:
  - editable `Name`
  - `Type`
  - `Delete` button below properties
- `Delete` key deletes selected deletable nodes.
- `Backspace` does not delete nodes.
- Delete button is disabled for non-deletable files.
- `Ctrl+Z` restores previous nodes from `historyRef`.

Undo uses:

```ts
historyRef.current = [...historyRef.current, canvas?.getNodes() ?? []];
canvas?.setNodes(previousNodes);
```

## Storage

Storage is abstracted through:

```text
src/dataStorage/storageAdapter.ts
```

Current adapter still uses `window.localStorage`, but storage callers use `appStorage` instead of touching `window.localStorage` directly.

Files using the adapter:

- `src/dataStorage/desktopStorage.ts`
- `src/dataStorage/workspaceStorage.ts`

Future storage changes should happen mostly inside `storageAdapter.ts`.

## Blueprint Area

Blueprint files live in:

```text
src/blueprint/
├─ BlueprintCanvas.tsx
├─ networkNodeTypes.ts
├─ topBarTabs.tsx
├─ neuralBlueprint/
│  ├─ NeuralBlueprintNode.tsx
│  ├─ NeuralBlueprintNodeTypes.ts
│  └─ NeuralBlueprintNode.css
├─ knowledgeGraph/
│  ├─ KnowledgeGraphNode.tsx
│  ├─ KnowledgeGraphNodeTypes.ts
│  └─ KnowledgeGraphNode.css
└─ trainingProcess/
   ├─ TrainingProcessNode.tsx
   ├─ TrainingProcessNodeTypes.ts
   └─ TrainingProcessNode.css
```

The three blueprint subdirectories are module/page folders, not just node folders. Future module-specific interactions should also live inside the corresponding folder.

`top-bar-tabs` is extracted into:

```text
src/blueprint/topBarTabs.tsx
```

`BlueprintCanvas.tsx` currently registers these node types:

- `neuralBlueprint`
- `knowledgeGraph`
- `trainingProcess`

`networkNodeTypes.ts` is the shared type entry for blueprint nodes.

## Current Build Status

The latest checked command passed:

```powershell
npm.cmd run build
```

## Current Knowledge Graph Training Flow

This section records the current implementation. It is the compact reference for
the Neural Blueprint -> Knowledge Graph -> Training Process path and supersedes
`KNOWLEDGE_GRAPH_UTILITY_README.md` when the two documents disagree.

### Main code locations

```text
src/blueprint/BlueprintCanvas.tsx
src/blueprint/dataController/
src/blueprint/neuralBlueprint/analysis/updateState.ts
src/blueprint/neuralBlueprint/analysis/updateInferenceTopologyOrder.ts
src/blueprint/neuralBlueprint/analysis/updateInferencePoints.ts
src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts
src/blueprint/InferenceMemoryProfileTypes.ts
src/blueprint/knowledgeGraph/model/types.ts
src/blueprint/knowledgeGraph/model/memoryState.ts
src/blueprint/knowledgeGraph/model/memoryOperations.ts
src/blueprint/knowledgeGraph/model/reasoning.ts
src/blueprint/knowledgeGraph/model/utilityEstimate.ts
src/blueprint/knowledgeGraph/model/trainingSignal.ts
src/blueprint/knowledgeGraph/model/trainingSimulation.ts
src/blueprint/knowledgeGraph/model/lossMetrics.ts
src/blueprint/knowledgeGraph/model/allocationStrategies.ts
src/taskData/fileInitialState.ts
src/taskData/configs/
```

### Top-level ownership

`BlueprintCanvas.tsx` owns the current workspace tab, the selected inference
memory model, the selected file, and the shared blueprint data controller.

`useBlueprintDataController` owns the Knowledge Graph state that is reused by
the Knowledge Graph tab and the Training Process tab.

Task-specific initial state is described as plain config in
`src/taskData/configs/` and parsed by `src/taskData/fileInitialState.ts`.

### Neural Blueprint to inference memory

Location:

```text
src/blueprint/neuralBlueprint/analysis/updateState.ts
```

Update order:

```text
applyTopologyOrders
-> updateInferenceTopologyOrders
-> updateModuleStats
-> updateInferencePoints
```

Inference stage propagation is in:

```text
src/blueprint/neuralBlueprint/analysis/updateInferenceTopologyOrder.ts
```

Formula:

```text
inheritedStages(node) =
  {0}, if node has no predecessors
  union(predecessor.inferenceTopologyOrder), otherwise

node.inferenceTopologyOrder =
  {stage + 1 if node.kind == "ReLU" else stage | stage in inheritedStages}
```

Linear memory is in:

```text
src/blueprint/neuralBlueprint/analysis/updateInferencePoints.ts
```

Formula:

```text
Linear.memoryPoint =
  Linear.stats.effectiveRank * Linear.statsBackward.effectiveRank
```

Inference model construction is in:

```text
src/blueprint/neuralBlueprint/analysis/inferenceMemoryProfile.ts
```

Model islands are weakly connected node islands. The participating nodes inside
an island are:

```text
participatingNodes =
  union(source descendants) intersect union(sink ancestors)
```

Only participating Linear nodes with a finite positive `memoryPoint` enter the
profile. Nodes are grouped by exact `inferenceTopologyOrder`.

Group memory formula:

```text
group.memoryPoint =
  floor(avg(linear.memoryPoint for linear in same inference stage group))
```

The selected model's `InferenceMemoryProfile` is passed to the Knowledge Graph
when Knowledge Graph memory source is `blueprint`.

### Knowledge Graph static model

Types are in:

```text
src/blueprint/knowledgeGraph/model/types.ts
```

Graph shape:

```text
KnowledgeGraphDefinition =
  nodes: Record<NodeId, KnowledgeNode>
  depEdges: DependencyEdge[]
  subEdges: SubstituteEdge[]
  interEdges: InterferenceEdge[]
```

Node fixed fields:

```text
requiredMemory
overfitCoefficient
lossMin
lossMax
dataAmount
color
position
```

Edge fixed fields:

```text
kind: dependency | substitute | interference
source: KnowledgeNode
target: KnowledgeNode
properties.requiredMemory
properties.overfitCoefficient
properties.lambda
```

Generated node and edge defaults are in:

```text
src/blueprint/knowledgeGraph/model/graphGenerator.ts
```

### Memory pools and stage tables

Memory state is in:

```text
src/blueprint/knowledgeGraph/model/memoryState.ts
src/blueprint/knowledgeGraph/model/memoryOperations.ts
```

Memory shape:

```text
KnowledgeGraphMemory =
  budgetPools: KnowledgeMemoryBudgetPool[]
  stageTables: KnowledgeMemoryStageTable[]
  selectedInferenceStage: number
  memoryProfileSource: preset | blueprint
  availableMemoryPoints: number
  availableReasoningPoints: number
```

Preset mode creates one pool:

```text
pool.memoryPoint = presetMemoryPoints
pool.inferenceStages = [0..presetReasoningPoints]
```

Blueprint mode maps each selected `InferenceMemoryProfile.group` to one pool:

```text
pool.id = "blueprint:" + group.id
pool.memoryPoint = round(group.memoryPoint)
pool.inferenceStages = group.inferenceStages
```

Stage tables are created for all stages from `0` to the maximum pool stage.
Each stage only contains allocations for pools that allow that stage.

Physical memory reads:

```text
stageMemory(entity, s) =
  sum(pool allocation for entity at stage s)

memoryThroughStage(entity, s) =
  sum(stageMemory(entity, t) for t = 0..s)

totalMemory(entity) =
  sum(stageMemory(entity, t) for all t)
```

All memory writes are rounded to non-negative integers and capped by pool
capacity.

### Reasoning pass

Reasoning is in:

```text
src/blueprint/knowledgeGraph/model/reasoning.ts
```

The entry point is:

```text
estimateStagedMastery(graph, memory, mode)
```

`mode` is `train` or `val`.

Stage 0 dependency cost:

```text
logCost_i[0] =
  log(requiredMemory_i)
  + sum(lambda_e * logCost_source[0] for incoming dependency e)

cost_i[0] = exp(logCost_i[0])
```

Stage `s > 0` dependency cost:

```text
activation_e[s-1] =
  clamp01(edgeMastery_e[s-1] * mastery_source[s-1])

logCost_i[s] =
  log(requiredMemory_i)
  + sum(lambda_e * (1 - activation_e[s-1]) * log(cost_source[s-1]))

cost_i[s] = exp(logCost_i[s])
```

Node adjusted memory:

```text
adjustedMemory_i[s] =
  mastery_i[s-1] * cost_i[s] + stageMemory_i[s]
```

For stage 0, previous mastery is 0.

Node overfit uses physical memory through the current stage:

```text
nodeOverfit_i[s] =
  computeOverfitRate(memoryThroughStage_i[s], cost_i[s], rho_i)
```

Base node mastery:

```text
baseMastery_i[s] =
  clamp01(adjustedMemory_i[s] / cost_i[s])

trainBaseMastery_i[s] = baseMastery_i[s]
valBaseMastery_i[s] = baseMastery_i[s] * (1 - nodeOverfit_i[s])
```

Edge equivalent memory:

```text
edgeEquivalentMemory_e[s] =
  edgeMastery_e[s-1] * requiredMemory_e + stageMemory_e[s]
```

Edge overfit:

```text
edgeOverfit_e[s] =
  computeOverfitRate(memoryThroughStage_e[s], requiredMemory_e, rho_e)
```

Edge mastery:

```text
edgeMastery_e[s] =
  clamp01(edgeEquivalentMemory_e[s] / requiredMemory_e)

valEdgeMastery_e[s] =
  edgeMastery_e[s] * (1 - edgeOverfit_e[s])
```

Substitute relation pass:

```text
edgeInfluence_e =
  1 - (1 - edgeMastery_e) ^ lambda_e

quality(source -> target) =
  clamp01(cost_source / cost_target * edgeInfluence_e)

substituteProduct_target *=
  1 - clamp01(quality(source -> target) * baseMastery_source)

substitutedMastery_target =
  clamp01(1 - (1 - baseMastery_target) * substituteProduct_target)
```

Interference relation pass:

```text
gamma_e =
  clamp01(1 - exp(-max(0, source.requiredMemory + target.requiredMemory - 24) / 36))

protection_e =
  edgeMastery_e ^ lambda_e

damage_e =
  clamp01(gamma_e * (1 - protection_e))

interferenceProduct_target *=
  1 - clamp01(damage_e * (1 - substitutedMastery_source))

finalMastery_target =
  clamp01(substitutedMastery_target * interferenceProduct_target)
```

The final stage estimate is used as graph-level mastery and effective cost.

### Overfit and loss

Loss formulas are in:

```text
src/blueprint/knowledgeGraph/model/lossMetrics.ts
```

Overfit:

```text
if allocatedMemory <= requiredMemory:
  overfitRate = 0
else:
  x = allocatedMemory / requiredMemory
  overfitRate =
    clamp01(sigmoid(3 * (rho * (x - 1) - 2 ^ (2 - rho))))

overfitFactor = 1 - overfitRate
```

Train loss:

```text
x = allocatedMemory / effectiveRequiredMemory

rawTrainLoss =
  lossMax
  - mastery * (lossMax - lossMin / sqrt(x / 2 + 0.5))

trainLoss =
  rawTrainLoss * (1 - overfitRate)
```

Validation loss:

```text
valLoss =
  lossMax - valMastery * (lossMax - lossMin)
```

Graph loss uses enabled dataset split weights. Each node data weight adds 1
before graph-level normalization:

```text
weight_i(split) =
  (datasetSplit_i[split] + 1) / sum(datasetSplit_j[split] + 1)

graphLoss =
  sum(weight_i * nodeLoss_i)
```

### Utility estimate

Utility is in:

```text
src/blueprint/knowledgeGraph/model/utilityEstimate.ts
src/blueprint/knowledgeGraph/model/trainingSignal.ts
```

There is no global utility normalization in the current implementation.

Data weight:

```text
D_i = trainData_i + 1
```

Node utility:

```text
O_WEIGHT = 0.1

U_node_i[s] =
  D_i * ((1 - mastery_i[s]) + O_WEIGHT * (1 - overfit_i[s]))
  / cost_i[s]

Self_node = U_node
Adjacent_node = 0
Total_node = Self_node
```

Edge common need term:

```text
edgeNeed_e[s] =
  (lambda_e * (1 - edgeMastery_e[s])
   + O_WEIGHT * (1 - edgeOverfit_e[s]))
  / requiredMemory_e
```

Dependency edge utility:

```text
Adjacent_dep_e[s] =
  mastery_source[s] * D_target * edgeNeed_e[s]

Self_dep = 0
Total_dep = Adjacent_dep
```

Substitute edge utility:

```text
quality(a -> b) =
  clamp01(cost_a[s] / cost_b[s])

SubDirection(a -> b) =
  mastery_a[s] * D_b * (1 - mastery_b[s]) * quality(a -> b)

Adjacent_sub_e[s] =
  (SubDirection(source -> target) + SubDirection(target -> source))
  * edgeNeed_e[s]

Self_sub = 0
Total_sub = Adjacent_sub
```

Interference edge utility:

```text
InterDirection(a -> b) =
  gamma_e * (1 - mastery_a[s]) * D_b * mastery_b[s]

Adjacent_inter_e[s] =
  (InterDirection(source -> target) + InterDirection(target -> source))
  * edgeNeed_e[s]

Self_inter = 0
Total_inter = Adjacent_inter
```

Training signal is a direct read of the utility report at the selected entity
and selected stage:

```text
TrainingSignal = { self, adjacent, total }
```

### One training step

Training is in:

```text
src/blueprint/knowledgeGraph/model/trainingSimulation.ts
```

Learning fraction:

```text
learningFraction =
  clamp01((15 + 2.5 * learningRate) / 100)
```

Per step:

```text
trainEstimate = estimateStagedMastery(graph, memory, "train")
utilities = estimateUtilityReport(graph, trainEstimate, datasetSplit)
```

The current training step does not call `trainingExploit.ts`.

Pool free memory:

```text
freeMemory_pool =
  floor(pool.memoryPoint - poolAllocatedMemory(pool))
```

Learning budget:

```text
totalFreeMemory = sum(freeMemory_pool)
sumC = sum(requiredMemory_entity for every node and edge)

learningBudget =
  min(totalFreeMemory, round(learningFraction * sqrt(sumC * totalFreeMemory)))
```

Pool additions are distributed by free-memory share with cumulative rounding.

Candidate set for each pool:

```text
candidates =
  pool.inferenceStages x allTrainingEntities
```

Candidate weight:

```text
weight(candidate) =
  utility(entity, stage).total
```

Weighted pick has a fixed skip mass of 1:

```text
totalMass = 1 + sum(candidate weights)
```

If the skip mass is selected, no point is allocated for that draw.

Loss history is recorded after every training step. Train loss is recorded every
epoch. Validation loss is recalculated only when `epoch % 10 == 0`; otherwise
`valLoss` is stored as `null`.

### Regularization

Regularization is in:

```text
src/blueprint/knowledgeGraph/model/trainingSimulation.ts
```

The current implementation chooses a random allowed target for each entity and
removes any excess physical memory.

Target range:

```text
sumC = sum(requiredMemory_entity for every node and edge)
memorySupplyRatio = availableMemoryPoints / sumC

baseLowerRatio =
  max(0, 0.7 - 0.1 * regularizationRate)

lowerRatio =
  baseLowerRatio * (1 + 0.3 * memorySupplyRatio)

upperRatio =
  1.5 * lowerRatio

target_entity =
  round(requiredMemory_entity * uniform(lowerRatio, upperRatio))
```

Removal count:

```text
removeCount_entity =
  max(0, totalMemory_entity - target_entity)
```

Removal roulette:

```text
1. Pick uniformly among stages where this entity has memory.
2. Pick uniformly among pools in that stage where this entity has memory.
3. Remove one memory point.
4. Repeat removeCount times.
```

The stage roulette is stage-uniform, not memory-point-uniform.

### Manual allocation helpers

Allocation helpers are in:

```text
src/blueprint/knowledgeGraph/model/allocationStrategies.ts
src/blueprint/knowledgeGraph/model/dependencyDepth.ts
```

Initialize model:

```text
ratio = max(0, Normal(0.05, 0.01))
capacity = min(availableMemoryPoints, sum(requiredMemory_entity))
pointCount = round(capacity * ratio)
```

Random allocation chooses:

```text
pool: weighted by remaining pool capacity
stage: uniform inside pool.inferenceStages
entity: uniform among allowed entities
```

Perfect allocation uses dependency depth:

```text
nodeStage =
  dependencyDepth(node)

dependencyEdgeStage =
  max(0, dependencyDepth(target) - 1)

interferenceEdgeStage =
  min(dependencyDepth(source), dependencyDepth(target))
```

Nodes and dependency edges are filled to required memory. Interference edges are
filled only when the two endpoints have different dependency stages. Substitute
edges are not filled by perfect allocation.
