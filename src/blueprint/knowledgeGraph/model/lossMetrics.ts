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
};

export type KnowledgeLossReport = {
  graphTrainLoss: number;
  graphValLoss: number;
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

    return [
      node.id,
      {
        overfitRate,
        overfitPercent: overfitRate * 100,
        effectiveMastery: valEffectiveMastery,
        trainLoss,
        valLoss,
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

  return {
    graphTrainLoss: graphNodes.reduce((sum, node, index) => sum + trainWeight(index) * (nodes[node.id]?.trainLoss ?? 0), 0),
    graphValLoss: graphNodes.reduce((sum, node, index) => sum + valWeight(index) * (nodes[node.id]?.valLoss ?? 0), 0),
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
