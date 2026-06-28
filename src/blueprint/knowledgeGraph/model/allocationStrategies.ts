import {
  clearAllocatedMemory,
  entityRequiredMemory,
  getTrainingEntities,
  readEntityPoolStageMemory,
  writeEntityMemory,
  writeEntityPoolStageMemory,
} from './memoryOperations';
import {
  calculateNodeDependencyDepths,
  entityDependencyStage,
} from './dependencyDepth';
import type { DatasetSplitResult } from './datasetSplit';
import { computeKnowledgeLossReport } from './lossMetrics';
import { cloneKnowledgeGraphMemory } from './memoryState';
import { createSeededRandom, sampleNormal } from './random';
import { estimateStagedMastery } from './reasoning';
import type {
  KnowledgeEntity,
  KnowledgeGraphDefinition,
  KnowledgeGraphMemory,
} from './types';

export function initializeAllocation(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  seed: string,
) {
  const entities = getTrainingEntities(graph);
  const next = cloneKnowledgeGraphMemory(memory);
  const random = randomFromSeed(seed);
  clearAllocatedMemory(next, entities);
  allocateRandomly(
    next,
    entities,
    random,
    initializationPointCount(next, entities, random),
  );
  return next;
}

export function perfectAllocation(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
) {
  const next = cloneKnowledgeGraphMemory(memory);
  const entities = getTrainingEntities(graph);
  clearAllocatedMemory(next, entities);
  const depths = calculateNodeDependencyDepths(graph);
  [
    ...Object.values(graph.nodes),
    ...graph.depEdges,
  ]
    .sort((left, right) => (
      stageOf(left) - stageOf(right)
    ))
    .forEach((entity) => {
      writeEntityMemory(
        next,
        entity,
        entityRequiredMemory(entity),
        stageOf(entity),
      );
    });

  graph.interEdges.forEach((edge) => {
    const sourceStage = entityDependencyStage(
      edge.source,
      depths,
      next.availableReasoningPoints,
    );
    const targetStage = entityDependencyStage(
      edge.target,
      depths,
      next.availableReasoningPoints,
    );
    if (sourceStage === targetStage) return;
    writeEntityMemory(
      next,
      edge,
      entityRequiredMemory(edge),
      Math.min(sourceStage, targetStage),
    );
  });
  return next;

  function stageOf(entity: KnowledgeEntity) {
    return entityDependencyStage(
      entity,
      depths,
      next.availableReasoningPoints,
    );
  }
}

export function transferAllocation(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  seed: string,
  stabilityPercent: number,
) {
  const next = perfectAllocation(graph, memory);
  const nodeEntities = Object.values(graph.nodes);
  const random = randomFromSeed(seed);
  clearAllocatedMemory(next, nodeEntities);
  allocateRandomly(
    next,
    nodeEntities,
    random,
    stabilityPointCount(next, stabilityPercent, random),
  );
  return next;
}

export function evaluateAllocation(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  dataset: DatasetSplitResult,
) {
  const train = estimateStagedMastery(
    graph,
    memory,
    'train',
  );
  const validation = estimateStagedMastery(
    graph,
    memory,
    'val',
  );
  return computeKnowledgeLossReport(
    graph,
    memory,
    train,
    validation,
    dataset,
  );
}

function allocateRandomly(
  memory: KnowledgeGraphMemory,
  entities: KnowledgeEntity[],
  random: () => number,
  points: number,
) {
  if (entities.length === 0) return;
  const pointCount = Math.min(
    Math.max(0, Math.floor(points)),
    Math.max(0, Math.floor(memory.availableMemoryPoints)),
  );

  const remaining = memory.budgetPools.map((pool) => pool.memoryPoint);
  for (let point = 0; point < pointCount; point += 1) {
    const poolIndex = weightedIndex(remaining, random);
    if (poolIndex < 0) break;
    const pool = memory.budgetPools[poolIndex];
    if (!pool) break;
    const stage = pool.inferenceStages[
      Math.floor(random() * pool.inferenceStages.length)
    ];
    const entity = entities[Math.floor(random() * entities.length)];
    writeEntityPoolStageMemory(
      memory,
      entity,
      pool.id,
      stage,
      readEntityPoolStageMemory(memory, entity, pool.id, stage) + 1,
    );
    remaining[poolIndex] -= 1;
  }
}

function initializationPointCount(
  memory: KnowledgeGraphMemory,
  entities: KnowledgeEntity[],
  random: () => number,
) {
  const ratio = Math.max(0, sampleNormal(random, 0.05, 0.01));
  const capacity = Math.min(
    memory.availableMemoryPoints,
    entities.reduce((sum, entity) => sum + entityRequiredMemory(entity), 0),
  );
  return Math.round(capacity * ratio);
}

function stabilityPointCount(
  memory: KnowledgeGraphMemory,
  stabilityPercent: number,
  random: () => number,
) {
  const sampled = Math.max(
    0,
    Math.round(sampleNormal(
      random,
      stabilityPercent / 2,
      Math.max(0.001, stabilityPercent / 20),
    )),
  );
  return Math.min(
    sampled,
    Math.max(0, Math.floor(memory.availableMemoryPoints)),
  );
}

function randomFromSeed(seed: string) {
  return seed.trim() ? createSeededRandom(seed.trim()) : Math.random;
}

function weightedIndex(weights: number[], random: () => number) {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return -1;
  let cursor = random() * total;
  const index = weights.findIndex((weight) => {
    cursor -= Math.max(0, weight);
    return cursor <= 0;
  });
  return index < 0 ? weights.length - 1 : index;
}
