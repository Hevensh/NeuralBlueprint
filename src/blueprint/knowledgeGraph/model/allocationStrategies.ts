import {
  clearAllocatedMemory,
  entityRequiredMemory,
  getTrainingEntities,
  readEntityMemory,
  writeEntityMemory,
} from './masterOperations';
import type { DatasetSplitResult } from './datasetSplit';
import { computeKnowledgeLossReport } from './lossMetrics';
import { cloneMasterGraph, updateOwnMasteries } from './masterGraph';
import { createSeededRandom, sampleNormal } from './random';
import { estimateMasteryWithReasoningBudget } from './reasoning';
import type {
  KnowledgeEntity,
  KnowledgeGraph,
  MasterGraph,
} from './types';

export function initializeAllocation(
  graph: KnowledgeGraph,
  master: MasterGraph,
  seed: string,
  stabilityPercent: number,
) {
  const entities = getTrainingEntities(graph);
  const next = cloneMasterGraph(master);
  clearAllocatedMemory(next, entities);
  allocateRandomly(next, entities, seed, stabilityPercent);
  return updateOwnMasteries(graph, next);
}

export function perfectAllocation(
  graph: KnowledgeGraph,
  master: MasterGraph,
) {
  const next = cloneMasterGraph(master);
  getTrainingEntities(graph).forEach((entity) => {
    writeEntityMemory(next, entity, entityRequiredMemory(entity));
  });
  return updateOwnMasteries(graph, next);
}

export function transferAllocation(
  graph: KnowledgeGraph,
  master: MasterGraph,
  seed: string,
  stabilityPercent: number,
) {
  const next = perfectAllocation(graph, master);
  const nodeEntities = Object.values(graph.nodes);
  clearAllocatedMemory(next, nodeEntities);
  allocateRandomly(next, nodeEntities, seed, stabilityPercent);
  return updateOwnMasteries(graph, next);
}

export function evaluateAllocation(
  graph: KnowledgeGraph,
  master: MasterGraph,
  dataset: DatasetSplitResult,
) {
  const train = estimateMasteryWithReasoningBudget(
    graph,
    master,
    master.availableReasoningPoints,
    'train',
  );
  const validation = estimateMasteryWithReasoningBudget(
    graph,
    master,
    master.availableReasoningPoints,
    'val',
  );
  return computeKnowledgeLossReport(
    graph,
    master,
    train,
    validation,
    dataset,
  );
}

function allocateRandomly(
  master: MasterGraph,
  entities: KnowledgeEntity[],
  seed: string,
  stabilityPercent: number,
) {
  if (entities.length === 0) return;
  const random = seed.trim() ? createSeededRandom(seed.trim()) : Math.random;
  const sampled = Math.max(
    0,
    Math.round(sampleNormal(
      random,
      stabilityPercent / 2,
      Math.max(0.001, stabilityPercent / 20),
    )),
  );
  const points = Math.min(
    sampled,
    Math.max(0, Math.floor(master.availableMemoryPoints)),
  );

  for (let point = 0; point < points; point += 1) {
    const entity = entities[Math.floor(random() * entities.length)];
    writeEntityMemory(master, entity, readEntityMemory(master, entity) + 1);
  }
}
