import {
  splitEnabledKnowledgeDatasets,
  type DatasetSplitResult,
  type KnowledgeDatasetCollection,
} from './datasetSplit';
import type { KnowledgeLossPoint } from './types';
import { computeKnowledgeLossReport } from './lossMetrics';
import { cloneKnowledgeGraphMemory } from './memoryState';
import {
  entityPoolAdaptationFactor,
  entityRequiredMemory,
  getTrainingEntities,
  poolAllocatedMemory,
  readEntityPoolStageMemory,
  writeEntityPoolStageMemory,
} from './memoryOperations';
import { varianceLogDistanceToLearningFactor } from '../../InferenceMemoryVariance';
import { hashSeed } from './random';
import { estimateStagedMastery } from './reasoning';
import { computeStageTrainingSignal } from './trainingSignal';
import { estimateUtilityReport } from './utilityEstimate';
import type {
  KnowledgeEntity,
  KnowledgeGraphDefinition,
  KnowledgeGraphMemory,
  KnowledgeMemoryBudgetPool,
  OptimizerKind,
} from './types';

export type TrainingSimulationOptions = {
  optimizer: OptimizerKind;
  learningRate: number;
  regularizationRate: number;
  epochs: number;
  datasetCollection: KnowledgeDatasetCollection;
  trainingRandomState: number;
};

export function createTrainingRandomState(seed: string): number {
  return hashSeed(seed) || 1;
}

export function runTrainingSimulation(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  epoch: number,
  lossHistory: KnowledgeLossPoint[],
  options: TrainingSimulationOptions,
) {
  let nextMemory = cloneKnowledgeGraphMemory(memory);
  let nextEpoch = Math.max(0, Math.floor(epoch));
  let randomState = options.trainingRandomState;
  const history = [...lossHistory];
  const epochs = Math.max(1, Math.floor(options.epochs));
  const datasetSplit = splitEnabledKnowledgeDatasets(
    graph,
    options.datasetCollection,
  );
  const learningFraction = rateToFraction(15, options.learningRate)
    * (datasetSplit.evaluation?.learningEfficiency ?? 1);

  for (let epochIndex = 0; epochIndex < epochs; epochIndex += 1) {
    const random = () => {
      randomState = (randomState + 0x6d2b79f5) >>> 0;
      let value = randomState;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };

    nextMemory = trainOneEpoch(
      graph,
      nextMemory,
      learningFraction,
      options.optimizer,
      options.regularizationRate,
      datasetSplit,
      random,
    );
    nextEpoch += 1;
    history.push(
      evaluateLoss(graph, nextMemory, nextEpoch, datasetSplit),
    );
  }

  return {
    memory: nextMemory,
    epoch: nextEpoch,
    lossHistory: history,
    trainingRandomState: randomState,
  };
}

function trainOneEpoch(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  learningFraction: number,
  optimizer: OptimizerKind,
  regularizationRate: number,
  datasetSplit: DatasetSplitResult,
  random: () => number,
) {
  const next = cloneKnowledgeGraphMemory(memory);
  const entities = getTrainingEntities(graph);
  if (entities.length === 0) return next;

  const estimate = estimateStagedMastery(
    graph,
    next,
    'train',
  );
  const utilities = estimateUtilityReport(
    graph,
    estimate,
    datasetSplit,
  );
  const pools = next.budgetPools.flatMap((pool) => {
    const stages = pool.inferenceStages.filter(
      (stage) => utilities.stages[stage],
    );
    if (stages.length === 0) return [];
    const freeMemory = Math.max(
      0,
      Math.floor(pool.memoryPoint - poolAllocatedMemory(next, pool.id)),
    );
    return freeMemory > 0 ? [{ pool, stages, freeMemory }] : [];
  });
  const totalFreeMemory = pools.reduce(
    (sum, pool) => sum + pool.freeMemory,
    0,
  );
  const totalRequiredMemory = entities.reduce(
    (sum, entity) => sum + entityRequiredMemory(entity),
    0,
  );
  const learnableFreeMemory = Math.min(
    totalFreeMemory,
    totalRequiredMemory * 2,
  );
  const learningBudget = Math.min(
    totalFreeMemory,
    Math.round(
      learningFraction
      * Math.sqrt(totalRequiredMemory * learnableFreeMemory),
    ),
  );
  let distributedBudget = 0;
  let cumulativeFreeMemory = 0;

  pools.forEach(({ pool, stages, freeMemory }) => {
    cumulativeFreeMemory += freeMemory;
    const poolBudget = totalFreeMemory > 0
      ? Math.round(
        learningBudget * cumulativeFreeMemory / totalFreeMemory,
      )
      : 0;
    const additions = poolBudget - distributedBudget;
    distributedBudget = poolBudget;
    const choices = stages.flatMap((stage) => (
      entities.map((entity) => ({
        stage,
        entity,
      }))
    ));
    const learningFactor = poolOptimizationFactor(pool, optimizer);
    if (learningFactor <= 0) return;
    const noAllocationWeight = 1 / learningFactor;

    for (let point = 0; point < additions; point += 1) {
      const choice = weightedPick(
        choices,
        ({ stage, entity }) => computeStageTrainingSignal(
          entity,
          utilities,
          stage,
        ).total * entityPoolAdaptationFactor(
          next,
          entity,
          pool.id,
        ),
        random,
        noAllocationWeight,
      );
      if (!choice) continue;
      writeEntityPoolStageMemory(
        next,
        choice.entity,
        pool.id,
        choice.stage,
        readEntityPoolStageMemory(
          next,
          choice.entity,
          pool.id,
          choice.stage,
        ) + 1,
      );
    }
  });

  regularizeMemory(
    next,
    entities,
    regularizationRate,
    optimizer,
    random,
  );
  return next;
}

function regularizeMemory(
  memory: KnowledgeGraphMemory,
  entities: KnowledgeEntity[],
  regularizationRate: number,
  optimizer: OptimizerKind,
  random: () => number,
) {
  const totalRequiredMemory = entities.reduce(
    (sum, entity) => sum + entityRequiredMemory(entity),
    0,
  );
  const memorySupplyRatio = totalRequiredMemory > 0
    ? memory.availableMemoryPoints / totalRequiredMemory
    : 0;
  const compressedSupplySurplus = Math.log1p(
    Math.max(0, memorySupplyRatio - 1),
  );
  const baseLowerRatio = Math.max(
    0,
    0.7 - 0.1 * regularizationRate,
  );
  const lowerRatio = baseLowerRatio * (
    1 + 0.12 * compressedSupplySurplus
  );
  const upperRatio = 1.5 * lowerRatio;
  entities.forEach((entity) => {
    const allocated = memory.budgetPools.reduce((sum, pool) => (
      sum + readEntityPoolMemory(memory, entity, pool.id)
    ), 0);
    const weightedAdaptationFactor = memory.budgetPools.reduce(
      (sum, pool) => {
        const poolRatio = memory.availableMemoryPoints > 0
          ? pool.memoryPoint / memory.availableMemoryPoints
          : 1 / Math.max(1, memory.budgetPools.length);
        return sum + poolRatio * entityPoolAdaptationFactor(
          memory,
          entity,
          pool.id,
        );
      },
      0,
    );
    const target = Math.round(
      entityRequiredMemory(entity)
      * (
        lowerRatio
        + random() * (upperRatio - lowerRatio)
      )
      * weightedAdaptationFactor,
    );
    const excess = Math.max(0, allocated - target);
    removeEntityMemoryRoulette(
      memory,
      entity,
      Math.round(excess),
      optimizer,
      random,
    );
  });
}

function removeEntityMemoryRoulette(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  count: number,
  optimizer: OptimizerKind,
  random: () => number,
) {
  for (let removed = 0; removed < count; removed += 1) {
    const slots = memory.budgetPools.flatMap((pool) => (
      pool.inferenceStages.flatMap((stage) => {
        const allocated = readEntityPoolStageMemory(
          memory,
          entity,
          pool.id,
          stage,
        );
        return allocated > 0
          ? [{ pool, stage, allocated }]
          : [];
      })
    ));
    if (slots.length === 0) return;
    const totalWeight = slots.reduce((sum, slot) => (
      sum + slot.allocated * poolOptimizationFactor(slot.pool, optimizer)
    ), 0);
    let cursor = random() * totalWeight;
    const slot = slots.find((candidate) => {
      cursor -= candidate.allocated
        * poolOptimizationFactor(candidate.pool, optimizer);
      return cursor <= 0;
    }) ?? slots.at(-1)!;
    const allocated = readEntityPoolStageMemory(
      memory,
      entity,
      slot.pool.id,
      slot.stage,
    );
    writeEntityPoolStageMemory(
      memory,
      entity,
      slot.pool.id,
      slot.stage,
      allocated - 1,
    );
  }
}

function readEntityPoolMemory(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  poolId: string,
) {
  return memory.stageTables.reduce((sum, table) => (
    sum + readEntityPoolStageMemory(memory, entity, poolId, table.stage)
  ), 0);
}

function poolOptimizationFactor(
  pool: KnowledgeMemoryBudgetPool,
  optimizer: OptimizerKind,
) {
  return optimizerVarianceLearningFactor(
    optimizer,
    pool.varianceLogDistance,
  );
}

export function optimizerVarianceLearningFactor(
  optimizer: OptimizerKind,
  varianceLogDistance: number | undefined,
) {
  return optimizer === 'adam'
    ? 1
    : varianceLogDistanceToLearningFactor(varianceLogDistance);
}

function evaluateLoss(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  epoch: number,
  datasetSplit: DatasetSplitResult,
): KnowledgeLossPoint {
  const train = estimateStagedMastery(
    graph,
    memory,
    'train',
  );
  const validate = epoch % 10 === 0;
  const validation = validate
    ? estimateStagedMastery(
      graph,
      memory,
      'val',
    )
    : train;
  const loss = computeKnowledgeLossReport(
    graph,
    memory,
    train,
    validation,
    datasetSplit,
  );
  return {
    epoch,
    trainLoss: loss.graphTrainLoss,
    valLoss: validate ? loss.graphValLoss : null,
    trainAccuracy: loss.graphTrainAccuracy,
    valAccuracy: validate ? loss.graphValAccuracy ?? null : null,
  };
}

function weightedPick<T>(
  values: T[],
  weightOf: (value: T) => number,
  random: () => number,
  emptyWeight = 1,
) {
  const weights = values.map((value) => Math.max(0, weightOf(value)));
  const noAllocationWeight = Math.max(0, emptyWeight);
  const total = noAllocationWeight + weights.reduce((sum, weight) => (
    sum + weight
  ), 0);
  let cursor = random() * total - noAllocationWeight;
  if (cursor < 0) return undefined;
  return values.find((_item, index) => {
    cursor -= weights[index];
    return cursor <= 0;
  }) ?? values.at(-1);
}

function rateToFraction(base: number, rate: number) {
  return Math.max(0, Math.min(1, (base + 2.5 * rate) / 100));
}
