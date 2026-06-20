import {
  splitEnabledKnowledgeDatasets,
  type DatasetSplitResult,
  type KnowledgeDatasetCollection,
} from './datasetSplit';
import { computeLossGradientReport } from './lossGradient';
import type { KnowledgeLossPoint } from './knowledgeStorage';
import { computeKnowledgeLossReport } from './lossMetrics';
import { cloneMasterGraph, updateOwnMasteries } from './masterGraph';
import {
  entityRequiredMemory,
  getTrainingEntities,
  readEntityMemory,
  totalAllocatedMemory,
  writeEntityMemory,
} from './masterOperations';
import { hashSeed } from './random';
import { estimateMasteryWithReasoningBudget } from './reasoning';
import type {
  KnowledgeEntity,
  KnowledgeGraph,
  MasterGraph,
} from './types';

export type TrainingSimulationOptions = {
  learningRate: number;
  regularizationRate: number;
  steps: number;
  datasetCollection: KnowledgeDatasetCollection;
  trainingRandomState: number;
};

export function createTrainingRandomState(seed: string): number {
  return hashSeed(seed) || 1;
}

export function runTrainingSimulation(
  graph: KnowledgeGraph,
  master: MasterGraph,
  epoch: number,
  lossHistory: KnowledgeLossPoint[],
  options: TrainingSimulationOptions,
) {
  let nextMaster = cloneMasterGraph(master);
  let nextEpoch = Math.max(0, Math.floor(epoch));
  let randomState = options.trainingRandomState;
  const history = [...lossHistory];
  const steps = Math.max(1, Math.floor(options.steps));
  const datasetSplit = splitEnabledKnowledgeDatasets(
    graph,
    options.datasetCollection,
  );

  for (let step = 0; step < steps; step += 1) {
    const random = () => {
      randomState = (randomState + 0x6d2b79f5) >>> 0;
      let value = randomState;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };

    nextMaster = trainOneStep(
      graph,
      nextMaster,
      rateToFraction(15, options.learningRate),
      rateToFraction(20, options.regularizationRate),
      datasetSplit,
      random,
    );
    nextEpoch += 1;

    if ((nextEpoch % 10 === 0) || step === steps - 1) {
      history.push(
        evaluateLoss(graph, nextMaster, nextEpoch, datasetSplit),
      );
    }
  }

  return {
    master: nextMaster,
    epoch: nextEpoch,
    lossHistory: history,
    trainingRandomState: randomState,
  };
}

function trainOneStep(
  graph: KnowledgeGraph,
  master: MasterGraph,
  learningFraction: number,
  regularizationFraction: number,
  datasetSplit: DatasetSplitResult,
  random: () => number,
) {
  const next = cloneMasterGraph(master);
  const entities = getTrainingEntities(graph);
  if (entities.length === 0) return next;

  const estimate = estimateMasteryWithReasoningBudget(
    graph,
    next,
    next.availableReasoningPoints,
    'train',
  );
  const gradients = computeLossGradientReport(
    graph,
    next,
    estimate,
    datasetSplit,
  );
  const weights = entities.map((entity) => ({
    entity,
    weight: utilityOf(entity, gradients),
  }));
  const freeMemory = Math.max(
    0,
    Math.floor(next.availableMemoryPoints - totalAllocatedMemory(next)),
  );
  const additions = Math.round(freeMemory * learningFraction);

  for (let point = 0; point < additions; point += 1) {
    const entity = weightedPick(weights, random);
    if (!entity) break;
    writeEntityMemory(next, entity, readEntityMemory(next, entity) + 1);
  }

  entities.forEach((entity) => {
    const memory = readEntityMemory(next, entity);
    const cost = entityRequiredMemory(entity);
    const excessRatio = Math.max(0, memory / Math.max(1, cost) - 1);
    const removed = Math.min(
      memory,
      Math.round(memory * regularizationFraction * excessRatio),
    );
    writeEntityMemory(next, entity, memory - removed);
  });

  return updateOwnMasteries(graph, next);
}

function evaluateLoss(
  graph: KnowledgeGraph,
  master: MasterGraph,
  epoch: number,
  datasetSplit: DatasetSplitResult,
): KnowledgeLossPoint {
  const train = estimateMasteryWithReasoningBudget(
    graph,
    master,
    master.availableReasoningPoints,
    'train',
  );
  const validate = epoch % 10 === 0;
  const validation = validate
    ? estimateMasteryWithReasoningBudget(
      graph,
      master,
      master.availableReasoningPoints,
      'val',
    )
    : train;
  const loss = computeKnowledgeLossReport(
    graph,
    master,
    train,
    validation,
    datasetSplit,
  );
  return {
    epoch,
    trainLoss: loss.graphTrainLoss,
    valLoss: validate ? loss.graphValLoss : null,
  };
}

function weightedPick(
  values: Array<{ entity: KnowledgeEntity; weight: number }>,
  random: () => number,
) {
  const total = values.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return values[Math.floor(random() * values.length)]?.entity;
  let cursor = random() * total;
  return values.find((item) => {
    cursor -= Math.max(0, item.weight);
    return cursor <= 0;
  })?.entity ?? values.at(-1)?.entity;
}

function utilityOf(
  entity: KnowledgeEntity,
  report: ReturnType<typeof computeLossGradientReport>,
) {
  if (entity.kind === 'node') return report.nodes[entity.id]?.utility ?? 0;
  return report.edges[entity.id]?.utility ?? 0;
}

function rateToFraction(base: number, rate: number) {
  return Math.max(0, Math.min(1, (base + 2.5 * rate) / 100));
}
