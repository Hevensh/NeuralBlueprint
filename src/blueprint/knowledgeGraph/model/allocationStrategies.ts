import {
  clearAllocatedMemory,
  entityPoolAdaptationFactor,
  entityRequiredMemory,
  getTrainingEntities,
  readEntityTotalMemory,
  readEntityPoolStageMemory,
  writeEntityMemory,
  writeEntityPoolStageMemory,
} from './memoryOperations';
import {
  calculateNodeDependencyDepths,
  calculateMaxDependencyDepth,
  entityDependencyStage,
} from './dependencyDepth';
import type { DatasetSplitResult } from './datasetSplit';
import { computeKnowledgeLossReport } from './lossMetrics';
import { cloneKnowledgeGraphMemory } from './memoryState';
import { createSeededRandom, sampleNormal } from './random';
import { estimateStagedMastery } from './reasoning';
import type {
  InferencePretrainingModule,
} from '../../InferenceMemoryProfileTypes';
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
) {
  const next = perfectAllocation(graph, memory);
  clearAllocatedMemory(next, Object.values(graph.nodes));
  return next;
}

export function clearAllocation(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
) {
  const next = cloneKnowledgeGraphMemory(memory);
  clearAllocatedMemory(next, getTrainingEntities(graph));
  return next;
}

export function applyPretrainedModuleAllocation(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  modules: InferencePretrainingModule[],
) {
  const next = cloneKnowledgeGraphMemory(memory);
  clearAllocatedMemory(next, graph.depEdges);
  const orderedModules = modules
    .filter((module) => (
      module.order > 0
      && module.memoryPointsPerDependency > 0
      && module.aggregationWeight > 0
      && module.inferenceStages.length > 0
    ))
    .sort((left, right) => (
      left.order - right.order
      || left.nodeId.localeCompare(right.nodeId)
    ));

  const depths = calculateNodeDependencyDepths(graph);
  const maxDependencyDepth = calculateMaxDependencyDepth(graph);

  orderedModules.forEach((module) => {
    const matchingDepth = module.order - 1;
    const edges = graph.depEdges.filter((edge) => (
      dependencyStage(edge) === matchingDepth
    ));
    const stages = [...module.inferenceStages].sort((left, right) => left - right);
    const outputStage = stages.at(-1);
    if (outputStage === undefined) return;
    const poolId = `blueprint:${stages.join(',')}`;
    const modulePoints = Math.max(
      0,
      Math.floor(
        module.memoryPointsPerDependency * module.aggregationWeight,
      ),
    );

    edges.forEach((edge) => {
      const availablePoints = Math.max(
        0,
        entityRequiredMemory(edge) - readEntityTotalMemory(next, edge),
      );
      const transferredPoints = Math.min(modulePoints, availablePoints);
      if (transferredPoints <= 0) return;
      writeEntityPoolStageMemory(
        next,
        edge,
        poolId,
        outputStage,
        readEntityPoolStageMemory(
          next,
          edge,
          poolId,
          outputStage,
        ) + transferredPoints,
      );
    });
  });
  return next;

  function dependencyStage(entity: KnowledgeEntity) {
    return entityDependencyStage(
      entity,
      depths,
      maxDependencyDepth,
    );
  }
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
    const entityWeights = entities.map((entity) => (
      entityPoolAdaptationFactor(memory, entity, pool.id)
    ));
    const entityIndex = weightedIndex(entityWeights, random);
    if (entityIndex < 0) {
      remaining[poolIndex] = 0;
      continue;
    }
    const entity = entities[entityIndex];
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
