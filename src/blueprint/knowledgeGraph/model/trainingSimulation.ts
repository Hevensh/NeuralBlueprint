import {
  splitEnabledKnowledgeDatasets,
  type DatasetSplitResult,
  type KnowledgeDatasetCollection,
} from './datasetSplit';
import type { KnowledgeLossPoint } from './types';
import { computeKnowledgeLossReport } from './lossMetrics';
import { cloneKnowledgeGraphMemory } from './memoryState';
import {
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
  const steps = Math.max(1, Math.floor(options.steps));
  const learningFraction = rateToFraction(15, options.learningRate);
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

    nextMemory = trainOneStep(
      graph,
      nextMemory,
      learningFraction,
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

function trainOneStep(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  learningFraction: number,
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
  const learningBudget = Math.min(
    totalFreeMemory,
    Math.round(
      learningFraction
      * Math.sqrt(totalRequiredMemory * totalFreeMemory),
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
    const learningFactor = poolVarianceLearningFactor(pool);
    if (learningFactor <= 0) return;
    const noAllocationWeight = 1 / learningFactor;

    for (let point = 0; point < additions; point += 1) {
      const choice = weightedPick(
        choices,
        ({ stage, entity }) => computeStageTrainingSignal(
          entity,
          utilities,
          stage,
        ).total,
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
    random,
  );
  return next;
}

function regularizeMemory(
  memory: KnowledgeGraphMemory,
  entities: KnowledgeEntity[],
  regularizationRate: number,
  random: () => number,
) {
  const totalRequiredMemory = entities.reduce(
    (sum, entity) => sum + entityRequiredMemory(entity),
    0,
  );
  const memorySupplyRatio = totalRequiredMemory > 0
    ? memory.availableMemoryPoints / totalRequiredMemory
    : 0;
  const baseLowerRatio = Math.max(
    0,
    0.7 - 0.1 * regularizationRate,
  );
  const lowerRatio = baseLowerRatio * (1 + 0.3 * memorySupplyRatio);
  const upperRatio = 1.5 * lowerRatio;
  memory.budgetPools.forEach((pool) => {
    const poolRatio = memory.availableMemoryPoints > 0
      ? pool.memoryPoint / memory.availableMemoryPoints
      : 1 / Math.max(1, memory.budgetPools.length);
    const regularizationFactor = poolVarianceLearningFactor(pool);
    const poolLowerRatio = lowerRatio * regularizationFactor;
    const poolUpperRatio = upperRatio * regularizationFactor;

    entities.forEach((entity) => {
      const allocated = readEntityPoolMemory(memory, entity, pool.id);
      const target = Math.round(
        entityRequiredMemory(entity)
        * poolRatio
        * (
          poolLowerRatio
          + random() * (poolUpperRatio - poolLowerRatio)
        ),
      );
      removeByPoolStageRoulette(
        memory,
        entity,
        pool.id,
        Math.max(0, allocated - target),
        random,
      );
    });
  });
}

function removeByPoolStageRoulette(
  memory: KnowledgeGraphMemory,
  entity: KnowledgeEntity,
  poolId: string,
  count: number,
  random: () => number,
) {
  for (let removed = 0; removed < count; removed += 1) {
    const stages = memory.stageTables.filter((table) => (
      table.allocations[poolId]
      && (
        readEntityPoolStageMemory(
          memory,
          entity,
          poolId,
          table.stage,
        ) > 0
      )
    ));
    if (stages.length === 0) return;
    const stage = stages[Math.floor(random() * stages.length)];
    const allocated = readEntityPoolStageMemory(
      memory,
      entity,
      poolId,
      stage.stage,
    );
    writeEntityPoolStageMemory(
      memory,
      entity,
      poolId,
      stage.stage,
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

function poolVarianceLearningFactor(pool: KnowledgeMemoryBudgetPool) {
  return varianceLogDistanceToLearningFactor(pool.varianceLogDistance);
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
