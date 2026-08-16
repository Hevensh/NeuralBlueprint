import type {
  EdgeId,
  KnowledgeGraphDefinition,
  KnowledgeGraphMemory,
  NodeId,
} from './types';
import type { ReasoningMasteryEstimate } from './reasoning';
import type { DatasetSplitResult } from './datasetSplit';
import {
  readEntityMemoryThroughStage,
} from './memoryOperations';

const EPS = 1e-8;

export type EntityOverfitMetrics = {
  overfitRate: number;
  overfitPercent: number;
  effectiveMastery: number;
};

export type NodeLossMetrics = EntityOverfitMetrics & {
  trainLoss: number;
  valLoss: number;
  trainAccuracy?: number;
  valAccuracy?: number;
};

export type KnowledgeLossReport = {
  graphTrainLoss: number;
  graphValLoss: number;
  graphTrainAccuracy?: number;
  graphValAccuracy?: number;
  nodes: Record<NodeId, NodeLossMetrics>;
  edges: Record<EdgeId, EntityOverfitMetrics>;
};

export function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function computeOverfitFactor(allocatedMemory: number, requiredMemory: number, rho: number, eps = EPS): number {
  return 1 - computeOverfitRate(
    allocatedMemory,
    requiredMemory,
    rho,
    eps,
  );
}

export function computeOverfitRate(
  allocatedMemory: number,
  requiredMemory: number,
  rho: number,
  eps = EPS,
): number {
  if (allocatedMemory <= requiredMemory) return 0;
  const x = allocatedMemory / (requiredMemory + eps);
  return clamp01(
    sigmoid(3 * (rho * (x - 1) - Math.pow(2, 2 - rho))),
  );
}

export function computeOverfitPercent(overfitFactor: number): number {
  return (1 - clamp01(overfitFactor)) * 100;
}

export function computeNodeTrainLoss(
  effectiveMastery: number,
  overfitRate: number,
  allocatedMemory: number,
  effectiveRequiredMemory: number,
  lossMin: number,
  lossMax: number,
): number {
  const x = allocatedMemory / effectiveRequiredMemory;
  const rawLoss = lossMax - clamp01(effectiveMastery)
    * (lossMax - lossMin / Math.sqrt(x / 2 + 0.5));
  return rawLoss * (1 - clamp01(overfitRate));
}

export function computeNodeValLoss(effectiveMastery: number, lossMin: number, lossMax: number): number {
  return lossMax - clamp01(effectiveMastery) * (lossMax - lossMin);
}

export function computeEstimatedAccuracy(
  mastery: number,
  classCount: number,
  difficulty: number,
  ceiling: number,
  accuracyCurve: 'power' | 'saturating' = 'power',
  curveStrength = difficulty,
  curveExponent = 1,
) {
  const chance = 1 / Math.max(2, Math.round(classCount));
  const upper = Math.max(chance, Math.min(1, ceiling));
  const normalizedMastery = accuracyCurve === 'saturating'
    ? saturatingAccuracy(clamp01(mastery), curveStrength, curveExponent)
    : Math.pow(clamp01(mastery), Math.max(0.1, difficulty));
  return chance + (upper - chance) * normalizedMastery;
}

function saturatingAccuracy(
  mastery: number,
  strength: number,
  exponent: number,
) {
  const gain = Math.max(0.1, strength);
  const saturation = clamp01(
    (1 - Math.exp(-gain * mastery))
    / (1 - Math.exp(-gain)),
  );
  return Math.pow(saturation, Math.max(0.1, exponent));
}

function edgeOverfitMetrics(
  memory: number,
  requiredMemory: number,
  overfitCoefficient: number,
  effectiveMastery: number,
): EntityOverfitMetrics {
  const overfitRate = computeOverfitRate(
    memory,
    requiredMemory,
    overfitCoefficient,
  );
  return {
    overfitRate,
    overfitPercent: overfitRate * 100,
    effectiveMastery,
  };
}

export function computeKnowledgeLossReport(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  trainEstimate: ReasoningMasteryEstimate,
  valEstimate = trainEstimate,
  datasetSplit?: DatasetSplitResult,
): KnowledgeLossReport {
  const graphNodes = Object.values(graph.nodes);
  const nodeEntries = graphNodes.map((node) => {
    const finalStage = trainEstimate.stages.at(-1);
    const allocatedMemory = Math.max(
      0,
      finalStage?.adjustedMemory[node.id] ?? 0,
    );
    const trainEffectiveRequiredMemory = trainEstimate.effectiveCost[node.id] ?? node.requiredMemory;
    const trainEffectiveMastery = trainEstimate.mastery[node.id] ?? 0;
    const valEffectiveMastery = valEstimate.mastery[node.id] ?? trainEffectiveMastery;
    const overfitRate = finalStage?.overfitRate[node.id] ?? 0;
    const trainLoss = computeNodeTrainLoss(trainEffectiveMastery, overfitRate, allocatedMemory, trainEffectiveRequiredMemory, node.lossMin, node.lossMax);
    const valLoss = computeNodeValLoss(valEffectiveMastery, node.lossMin, node.lossMax);
    const evaluation = datasetSplit?.evaluation;
    const trainAccuracy = evaluation
      ? computeEstimatedAccuracy(
          trainEffectiveMastery,
          evaluation.classCount,
          evaluation.difficulty,
          evaluation.ceiling,
          evaluation.accuracyCurve,
          evaluation.curveStrength,
          evaluation.curveExponent,
        )
      : undefined;
    const valAccuracy = evaluation
      ? computeEstimatedAccuracy(
          valEffectiveMastery,
          evaluation.classCount,
          evaluation.difficulty,
          evaluation.ceiling,
          evaluation.accuracyCurve,
          evaluation.curveStrength,
          evaluation.curveExponent,
        )
      : undefined;

    return [
      node.id,
      {
        overfitRate,
        overfitPercent: overfitRate * 100,
        effectiveMastery: valEffectiveMastery,
        trainLoss,
        valLoss,
        trainAccuracy,
        valAccuracy,
      },
    ] as const;
  });

  const nodes = Object.fromEntries(nodeEntries);
  const normalizedSplitWeight = (split: 'train' | 'val') => {
    const weights = graphNodes.map((node) => (
      Math.max(
        0,
        datasetSplit?.nodes[node.id]?.[split] ?? node.dataAmount,
      ) + 1
    ));
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    return (index: number) => (weightSum > 0 ? weights[index] / weightSum : 0);
  };
  const trainWeight = normalizedSplitWeight('train');
  const valWeight = normalizedSplitWeight('val');
  const graphTrainAccuracy = datasetSplit?.evaluation
    ? graphAccuracy(
        graphNodes.map((node) => trainEstimate.mastery[node.id] ?? 0),
        graphNodes.map((_node, index) => trainWeight(index)),
        graphNodes.map((node) => nodes[node.id]?.trainAccuracy ?? 0),
        datasetSplit.evaluation,
      )
    : undefined;
  const graphValAccuracy = datasetSplit?.evaluation
    ? graphAccuracy(
        graphNodes.map((node) => valEstimate.mastery[node.id] ?? 0),
        graphNodes.map((_node, index) => valWeight(index)),
        graphNodes.map((node) => nodes[node.id]?.valAccuracy ?? 0),
        datasetSplit.evaluation,
      )
    : undefined;
  const capacityLoss = computeCapacityLoss(
    memory.availableMemoryPoints,
    datasetSplit?.capacity,
  );

  return {
    graphTrainLoss: graphNodes.reduce((sum, node, index) => sum + trainWeight(index) * (nodes[node.id]?.trainLoss ?? 0), 0)
      + capacityLoss.underfit,
    graphValLoss: graphNodes.reduce((sum, node, index) => sum + valWeight(index) * (nodes[node.id]?.valLoss ?? 0), 0)
      + capacityLoss.underfit
      + capacityLoss.overfit,
    graphTrainAccuracy,
    graphValAccuracy,
    nodes,
    edges: Object.fromEntries(
      [
        ...graph.depEdges,
        ...graph.subEdges,
        ...graph.interEdges,
      ].map((edge) => [
        edge.id,
        edgeOverfitMetrics(
          readEntityMemoryThroughStage(
            memory,
            edge,
            memory.availableReasoningPoints,
          ),
          edge.properties.requiredMemory,
          edge.properties.overfitCoefficient,
          valEstimate.stages.at(-1)?.edges[edge.id]?.mastery ?? 0,
        ),
      ]),
    ),
  };
}

function computeCapacityLoss(
  memoryPoints: number,
  capacity: DatasetSplitResult['capacity'],
) {
  const optimal = capacity?.optimalMemoryPoints;
  if (!optimal || optimal <= 0 || memoryPoints <= 0) {
    return { underfit: 0, overfit: 0 };
  }

  const logRatio = Math.log2(memoryPoints / optimal);
  return logRatio < 0
    ? {
        underfit: (capacity.undercapacityLossScale ?? 0) * logRatio ** 2,
        overfit: 0,
      }
    : {
        underfit: 0,
        overfit: (capacity.excessCapacityLossScale ?? 0) * logRatio ** 2,
      };
}

function graphAccuracy(
  mastery: number[],
  weights: number[],
  nodeAccuracy: number[],
  evaluation: NonNullable<DatasetSplitResult['evaluation']>,
) {
  if (evaluation.accuracyCurve !== 'saturating') {
    return nodeAccuracy.reduce((sum, value, index) => (
      sum + (weights[index] ?? 0) * value
    ), 0);
  }

  const graphMastery = mastery.reduce((sum, value, index) => (
    sum + (weights[index] ?? 0) * clamp01(value)
  ), 0);
  return computeEstimatedAccuracy(
    graphMastery,
    evaluation.classCount,
    evaluation.difficulty,
    evaluation.ceiling,
    evaluation.accuracyCurve,
    evaluation.curveStrength,
    evaluation.curveExponent,
  );
}
