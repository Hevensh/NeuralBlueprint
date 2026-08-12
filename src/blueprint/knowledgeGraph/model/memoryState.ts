import type { InferenceMemoryProfile } from '../../InferenceMemoryProfileTypes';
import { calculateMaxDependencyDepth } from './dependencyDepth';
import {
  entityPoolAdaptationCompatibility,
  poolAllocatedMemory,
  totalAllocatedMemory,
} from './memoryOperations';
import type {
  KnowledgeGraphDefinition,
  KnowledgeGraphMemory,
  KnowledgeGraphStats,
  KnowledgeMemoryAllocation,
  KnowledgeMemoryBudgetPool,
  KnowledgeMemoryStageTable,
  MemoryProfileSource,
} from './types';
import {
  cloneAdaptationPoints,
  createEmptyAdaptationPoints,
} from './adaptation';

const PRESET_POOL_ID = 'preset';

export function clamp01(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function createKnowledgeGraphMemory(
  graph: KnowledgeGraphDefinition,
  availableMemoryPoints: number,
  availableReasoningPoints: number,
): KnowledgeGraphMemory {
  const memory = normalizeMemoryPoint(availableMemoryPoints);
  const reasoning = normalizeReasoningPoint(availableReasoningPoints);
  const budgetPools = [createPresetPool(memory, reasoning)];
  return {
    budgetPools,
    stageTables: createStageTables(graph, budgetPools),
    selectedInferenceStage: reasoning,
    memoryProfileSource: 'preset',
    presetMemoryPoints: memory,
    presetReasoningPoints: reasoning,
    availableMemoryPoints: memory,
    availableReasoningPoints: reasoning,
  };
}

export function cloneKnowledgeGraphMemory(
  memory: KnowledgeGraphMemory,
): KnowledgeGraphMemory {
  return {
    ...memory,
    budgetPools: memory.budgetPools.map((pool) => ({
      ...pool,
      inferenceStages: [...pool.inferenceStages],
      adaptationCapability: cloneAdaptationPoints(pool.adaptationCapability),
    })),
    stageTables: memory.stageTables.map((table) => ({
      stage: table.stage,
      allocations: Object.fromEntries(
        Object.entries(table.allocations).map(([poolId, allocation]) => [
          poolId,
          cloneAllocation(allocation),
        ]),
      ),
    })),
  };
}

export function configurePresetMemoryProfile(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  availableMemoryPoints: number,
  availableReasoningPoints: number,
) {
  const memoryPoints = normalizeMemoryPoint(availableMemoryPoints);
  const reasoningPoints = normalizeReasoningPoint(availableReasoningPoints);
  const updated = {
    ...memory,
    presetMemoryPoints: memoryPoints,
    presetReasoningPoints: reasoningPoints,
  };
  return memory.memoryProfileSource === 'preset'
    ? applyBudgetPools(
        graph,
        updated,
        [createPresetPool(memoryPoints, reasoningPoints)],
        'preset',
      )
    : updated;
}

export function setMemoryProfileSource(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  source: MemoryProfileSource,
  profile: InferenceMemoryProfile,
) {
  const pools = source === 'preset'
    ? [createPresetPool(
        memory.presetMemoryPoints,
        memory.presetReasoningPoints,
      )]
    : createBlueprintPools(profile);
  return applyBudgetPools(graph, memory, pools, source);
}

export function syncBlueprintMemoryProfile(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  profile: InferenceMemoryProfile,
) {
  if (memory.memoryProfileSource !== 'blueprint') return memory;
  const pools = createBlueprintPools(profile);
  if (samePoolConfiguration(memory.budgetPools, pools)) return memory;
  return applyBudgetPools(graph, memory, pools, 'blueprint');
}

export function setSelectedInferenceStage(
  memory: KnowledgeGraphMemory,
  stage: number,
) {
  return {
    ...memory,
    selectedInferenceStage: Math.max(
      0,
      Math.min(memory.availableReasoningPoints, Math.floor(stage)),
    ),
  };
}

function applyBudgetPools(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  budgetPools: KnowledgeMemoryBudgetPool[],
  source: MemoryProfileSource,
): KnowledgeGraphMemory {
  const followedLastStage = memory.selectedInferenceStage
    === memory.availableReasoningPoints;
  const stageTables = createStageTables(graph, budgetPools);
  const previousTables = new Map(
    memory.stageTables.map((table) => [table.stage, table]),
  );

  stageTables.forEach((table) => {
    const previous = previousTables.get(table.stage);
    if (!previous) return;
    Object.keys(table.allocations).forEach((poolId) => {
      const allocation = previous.allocations[poolId];
      if (allocation) table.allocations[poolId] = cloneAllocation(allocation);
    });
  });

  const next = {
    ...memory,
    budgetPools,
    stageTables,
    memoryProfileSource: source,
    availableMemoryPoints: budgetPools.reduce(
      (sum, pool) => sum + pool.memoryPoint,
      0,
    ),
    availableReasoningPoints: maxInferenceStage(budgetPools),
  };
  fitPoolsToBudget(next, graph);
  next.selectedInferenceStage = followedLastStage
    ? next.availableReasoningPoints
    : Math.min(
        memory.selectedInferenceStage,
        next.availableReasoningPoints,
      );
  return next;
}

function createPresetPool(
  memoryPoint: number,
  reasoningPoint: number,
): KnowledgeMemoryBudgetPool {
  return {
    id: PRESET_POOL_ID,
    inferenceStages: Array.from(
      { length: reasoningPoint + 1 },
      (_, stage) => stage,
    ),
    memoryPoint,
    adaptationCapability: createEmptyAdaptationPoints(),
  };
}

function createBlueprintPools(profile: InferenceMemoryProfile) {
  return profile.groups
    .filter((group) => group.memoryPoint > 0 && group.inferenceStages.length > 0)
    .map<KnowledgeMemoryBudgetPool>((group) => ({
      id: `blueprint:${group.id}`,
      inferenceStages: normalizeStages(group.inferenceStages),
      memoryPoint: normalizeMemoryPoint(group.memoryPoint),
      adaptationCapability: {
        receptiveField: { ...group.adaptationPoints.repetition },
        distanceIndex: { ...group.adaptationPoints.distance },
      },
      varianceLogDistance: normalizeFactor(group.varianceLogDistance),
    }));
}

function createStageTables(
  graph: KnowledgeGraphDefinition,
  pools: KnowledgeMemoryBudgetPool[],
) {
  const lastStage = maxInferenceStage(pools);
  return Array.from(
    { length: lastStage + 1 },
    (_, stage): KnowledgeMemoryStageTable => ({
      stage,
      allocations: Object.fromEntries(
        pools
          .filter((pool) => pool.inferenceStages.includes(stage))
          .map((pool) => [pool.id, createAllocation(graph)]),
      ),
    }),
  );
}

function createAllocation(
  graph: KnowledgeGraphDefinition,
): KnowledgeMemoryAllocation {
  const edgeIds = [
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ].map((edge) => edge.id);
  return {
    nodes: Object.fromEntries(
      Object.keys(graph.nodes).map((nodeId) => [nodeId, 0]),
    ),
    edges: Object.fromEntries(edgeIds.map((edgeId) => [edgeId, 0])),
  };
}

function fitPoolsToBudget(
  memory: KnowledgeGraphMemory,
  graph: KnowledgeGraphDefinition,
) {
  const edges = [
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ];
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

  memory.budgetPools.forEach((pool) => {
    memory.stageTables.forEach((table) => {
      const allocation = table.allocations[pool.id];
      if (!allocation) return;
      Object.keys(allocation.nodes).forEach((nodeId) => {
        const node = graph.nodes[nodeId];
        if (
          node
          && entityPoolAdaptationCompatibility(memory, node, pool.id) <= 0
        ) allocation.nodes[nodeId] = 0;
      });
      Object.keys(allocation.edges).forEach((edgeId) => {
        const edge = edgeById.get(edgeId);
        if (
          edge
          && entityPoolAdaptationCompatibility(memory, edge, pool.id) <= 0
        ) allocation.edges[edgeId] = 0;
      });
    });

    let overflow = Math.max(
      0,
      poolAllocatedMemory(memory, pool.id) - pool.memoryPoint,
    );
    if (overflow > 0) {
      memory.stageTables.forEach((table) => {
        const allocation = table.allocations[pool.id];
        if (!allocation) return;
        [allocation.nodes, allocation.edges].forEach((values) => {
          Object.keys(values).forEach((id) => {
            const removed = Math.min(values[id], overflow);
            values[id] -= removed;
            overflow -= removed;
          });
        });
      });
    }
  });
}

function samePoolConfiguration(
  left: KnowledgeMemoryBudgetPool[],
  right: KnowledgeMemoryBudgetPool[],
) {
  return left.length === right.length && left.every((pool, index) => (
    pool.id === right[index]?.id
    && pool.memoryPoint === right[index]?.memoryPoint
    && pool.varianceLogDistance === right[index]?.varianceLogDistance
    && adaptationPointSignature(pool.adaptationCapability)
      === adaptationPointSignature(right[index]?.adaptationCapability)
    && pool.inferenceStages.join(',') === right[index]?.inferenceStages.join(',')
  ));
}

function cloneAllocation(allocation: KnowledgeMemoryAllocation) {
  return {
    nodes: { ...allocation.nodes },
    edges: { ...allocation.edges },
  };
}

function adaptationPointSignature(
  points: KnowledgeMemoryBudgetPool['adaptationCapability'] | undefined,
) {
  if (!points) return '';
  return [
    ...Object.values(points.receptiveField),
    ...Object.values(points.distanceIndex),
  ].join(',');
}

function normalizeStages(stages: number[]) {
  return [...new Set(stages.map(normalizeReasoningPoint))]
    .sort((left, right) => left - right);
}

function normalizeMemoryPoint(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function normalizeReasoningPoint(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function normalizeFactor(value: number) {
  return Number.isFinite(value) ? value : 1;
}

function maxInferenceStage(pools: KnowledgeMemoryBudgetPool[]) {
  return pools.reduce(
    (max, pool) => Math.max(max, ...pool.inferenceStages),
    0,
  );
}

export function calculateKnowledgeStats(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
): KnowledgeGraphStats {
  const allEdges = [
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ];
  const totalAllocatedNodeMemory = memory.stageTables.reduce(
    (sum, table) => sum + Object.values(table.allocations).reduce(
      (subtotal, allocation) => subtotal
        + Object.values(allocation.nodes).reduce(
          (nodeSum, value) => nodeSum + value,
          0,
        ),
      0,
    ),
    0,
  );
  const totalAllocatedEdgeMemory = memory.stageTables.reduce(
    (sum, table) => sum + Object.values(table.allocations).reduce(
      (subtotal, allocation) => subtotal
        + Object.values(allocation.edges).reduce(
          (edgeSum, value) => edgeSum + value,
          0,
        ),
      0,
    ),
    0,
  );
  const usedMemoryPoints = totalAllocatedMemory(memory);

  return {
    nodeCount: Object.keys(graph.nodes).length,
    dependencyEdgeCount: graph.depEdges.length,
    substituteEdgeCount: graph.subEdges.length,
    interferenceEdgeCount: graph.interEdges.length,
    totalRequiredNodeMemory: Object.values(graph.nodes).reduce(
      (sum, node) => sum + node.requiredMemory,
      0,
    ),
    totalRequiredEdgeMemory: allEdges.reduce(
      (sum, edge) => sum + edge.properties.requiredMemory,
      0,
    ),
    totalAllocatedNodeMemory,
    totalAllocatedEdgeMemory,
    availableMemoryPoints: memory.availableMemoryPoints,
    usedMemoryPoints,
    remainingMemoryPoints: memory.availableMemoryPoints - usedMemoryPoints,
    availableReasoningPoints: memory.availableReasoningPoints,
    maxDependencyDepth: calculateMaxDependencyDepth(graph),
  };
}
