import type {
  KnowledgeEntity,
  KnowledgeAdaptationBalance,
  KnowledgeGraphDefinition,
  KnowledgeMemoryAllocation,
  KnowledgeMemoryBudgetPool,
  KnowledgeGraphMemory,
} from './types';
import {
  computeAdaptationBalance,
} from './adaptation';

export function getTrainingEntities(graph: KnowledgeGraphDefinition): KnowledgeEntity[] {
  return [
    ...Object.values(graph.nodes),
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ];
}

export function readEntityMemory(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  stage = memory.selectedInferenceStage,
) {
  return readEntityStageMemory(memory, entity, stage);
}

export function readEntityStageMemory(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  stage: number,
) {
  const table = memory.stageTables[stage];
  if (!table) return 0;
  return Object.values(table.allocations).reduce(
    (sum, allocation) => sum + readAllocationMemory(allocation, entity),
    0,
  );
}

export function readEntityPoolStageMemory(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  poolId: string,
  stage: number,
) {
  const allocation = memory.stageTables[stage]?.allocations[poolId];
  return allocation ? readAllocationMemory(allocation, entity) : 0;
}

export function readEntityMemoryThroughStage(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  stage: number,
) {
  return memory.stageTables
    .slice(0, stage + 1)
    .reduce(
      (sum, table) => sum + readEntityStageMemory(memory, entity, table.stage),
      0,
    );
}

export function readEntityTotalMemory(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
) {
  return memory.stageTables.reduce(
    (sum, table) => sum + readEntityStageMemory(memory, entity, table.stage),
    0,
  );
}

export function writeEntityMemory(
  state: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  amount: number,
  stage = state.selectedInferenceStage,
) {
  const slots = poolStageSlots(state, stage);
  writeAcrossSlots(state, entity, integerMemory(amount), slots);
}

export function entityPoolAdaptationBalance(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  poolId: string,
): KnowledgeAdaptationBalance {
  const pool = memory.budgetPools.find((candidate) => candidate.id === poolId);
  return pool
    ? computeAdaptationBalance(
        pool.adaptationCapability,
        withEntityComplexityRequirement(entity),
        pool.complexityCapability ?? 0,
      )
    : createNeutralAdaptationBalance();
}

export function entityPoolAdaptationFactor(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  poolId: string,
) {
  return entityPoolAdaptationBalance(
    memory,
    entity,
    poolId,
  ).factor;
}

export function entityAdaptationRequirements(entity: KnowledgeEntity) {
  return entity.kind === 'node'
    ? entity.adaptationRequirements
    : entity.properties.adaptationRequirements;
}

function withEntityComplexityRequirement(entity: KnowledgeEntity) {
  const requirements = entityAdaptationRequirements(entity);
  const minimumInferenceStages = entity.kind === 'node'
    ? 0
    : entity.properties.minimumInferenceStages ?? 0;
  return {
    ...requirements,
    complexity: Math.max(
      requirements.complexity ?? 0,
      minimumInferenceStages,
    ),
  };
}

function createNeutralAdaptationBalance(): KnowledgeAdaptationBalance {
  return {
    comparedCellCount: 0,
    maxGap: 0,
    meanGap: 0,
    maxSurplus: 0,
    meanSurplus: 0,
    balance: 0,
    factor: 1,
  };
}

export function writeEntityPoolStageMemory(
  state: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  poolId: string,
  stage: number,
  amount: number,
) {
  const allocation = state.stageTables[stage]?.allocations[poolId];
  if (!allocation) return;
  const values = entity.kind === 'node' ? allocation.nodes : allocation.edges;
  const current = values[entity.id] ?? 0;
  const remaining = Math.max(
    0,
    poolCapacity(state, poolId) - (poolAllocatedMemory(state, poolId) - current),
  );
  values[entity.id] = Math.min(
    Math.floor(remaining),
    integerMemory(amount),
  );
}

export function totalAllocatedMemory(memory: KnowledgeGraphMemory) {
  return memory.budgetPools.reduce(
    (sum, pool) => sum + poolAllocatedMemory(memory, pool.id),
    0,
  );
}

export function poolAllocatedMemory(memory: KnowledgeGraphMemory, poolId: string) {
  return memory.stageTables.reduce((sum, table) => {
    const allocation = table.allocations[poolId];
    return sum + (allocation ? allocationMemory(allocation) : 0);
  }, 0);
}

export function clearAllocatedMemory(
  memory: KnowledgeGraphMemory,
  entities: KnowledgeEntity[],
) {
  memory.stageTables.forEach((table) => {
    Object.entries(table.allocations).forEach(([poolId]) => {
      entities.forEach((entity) => {
        writeEntityPoolStageMemory(memory, entity, poolId, table.stage, 0);
      });
    });
  });
}

export function entityRequiredMemory(entity: KnowledgeEntity) {
  return entity.kind === 'node'
    ? entity.requiredMemory
    : entity.properties.requiredMemory;
}

export function entityPoolStageRequiredMemory(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  pool: KnowledgeMemoryBudgetPool,
) {
  const poolRatio = memory.availableMemoryPoints > 0
    ? pool.memoryPoint / memory.availableMemoryPoints
    : 1 / Math.max(1, memory.budgetPools.length);
  return entityRequiredMemory(entity)
    * poolRatio
    / Math.max(1, pool.inferenceStages.length);
}

function writeAcrossSlots(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  target: number,
  slots: PoolStageSlot[],
) {
  if (slots.length === 0) return;
  let current = slots.reduce(
    (sum, slot) => sum + readEntityPoolStageMemory(
      memory,
      entity,
      slot.pool.id,
      slot.stage,
    ),
    0,
  );
  while (current > target) {
    const slot = [...slots].sort((left, right) => (
      slotMemory(memory, entity, right) - slotMemory(memory, entity, left)
    ))[0];
    if (!slot || slotMemory(memory, entity, slot) <= 0) break;
    writeEntityPoolStageMemory(
      memory,
      entity,
      slot.pool.id,
      slot.stage,
      slotMemory(memory, entity, slot) - 1,
    );
    current -= 1;
  }

  while (current < target) {
    const slot = [...slots].sort((left, right) => (
      slotOpportunity(memory, entity, right)
      - slotOpportunity(memory, entity, left)
    ))[0];
    if (!slot || slotOpportunity(memory, entity, slot) <= 0) break;
    writeEntityPoolStageMemory(
      memory,
      entity,
      slot.pool.id,
      slot.stage,
      slotMemory(memory, entity, slot) + 1,
    );
    current += 1;
  }
}

function poolStageSlots(memory: KnowledgeGraphMemory, stage: number) {
  return memory.budgetPools
    .filter((pool) => pool.inferenceStages.includes(stage))
    .map((pool) => ({ pool, stage }));
}

function readAllocationMemory(
  allocation: KnowledgeMemoryAllocation,
  entity: KnowledgeEntity,
) {
  return entity.kind === 'node'
    ? allocation.nodes[entity.id] ?? 0
    : allocation.edges[entity.id] ?? 0;
}

function allocationMemory(allocation: KnowledgeMemoryAllocation) {
  return [allocation.nodes, allocation.edges].reduce(
    (total, values) => total
      + Object.values(values).reduce((sum, value) => sum + value, 0),
    0,
  );
}

function poolCapacity(memory: KnowledgeGraphMemory, poolId: string) {
  return memory.budgetPools.find((pool) => pool.id === poolId)?.memoryPoint ?? 0;
}

type PoolStageSlot = {
  pool: KnowledgeMemoryBudgetPool;
  stage: number;
};

function slotMemory(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  slot: PoolStageSlot,
) {
  return readEntityPoolStageMemory(
    memory,
    entity,
    slot.pool.id,
    slot.stage,
  );
}

function slotOpportunity(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  slot: PoolStageSlot,
) {
  return poolRemaining(memory, slot.pool.id)
    * entityPoolAdaptationFactor(memory, entity, slot.pool.id);
}

function poolRemaining(memory: KnowledgeGraphMemory, poolId: string) {
  return Math.max(
    0,
    poolCapacity(memory, poolId) - poolAllocatedMemory(memory, poolId),
  );
}

function integerMemory(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
