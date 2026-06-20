import type {
  EdgeId,
  KnowledgeGraph,
  MasterGraph,
  NodeId,
} from './types';
import type { ReasoningMasteryEstimate } from './reasoning';
import type { DatasetSplitResult } from './datasetSplit';

const EPS = 1e-8;

export type EntityOverfitMetrics = {
  overfitFactor: number;
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
  if (allocatedMemory <= requiredMemory) return 1;

  const x = allocatedMemory / (requiredMemory + eps);
  return clamp01(sigmoid(3 * (Math.pow(2, 2 - rho) - rho * (x - 1))));
}

export function computeOverfitPercent(overfitFactor: number): number {
  return (1 - clamp01(overfitFactor)) * 100;
}

export function computeNodeTrainLoss(
  effectiveMastery: number,
  allocatedMemory: number,
  effectiveRequiredMemory: number,
  lossMin: number,
  lossMax: number,
): number {
  const x = allocatedMemory / effectiveRequiredMemory;
  return lossMax - clamp01(effectiveMastery) * (lossMax - lossMin / Math.sqrt(x / 2 + 0.5));
}

export function computeNodeValLoss(effectiveMastery: number, lossMin: number, lossMax: number): number {
  return lossMax - clamp01(effectiveMastery) * (lossMax - lossMin);
}

export function computeEdgeMastery(edgeMemory: number, edgeRequiredMemory: number, eps = EPS): number {
  return clamp01(Math.max(0, edgeMemory) / (Math.max(eps, edgeRequiredMemory) + eps));
}

export function computeEdgeEffectiveMastery(edgeMemory: number, edgeRequiredMemory: number, rho: number, eps = EPS): number {
  const mastery = computeEdgeMastery(edgeMemory, edgeRequiredMemory, eps);
  if (edgeMemory <= edgeRequiredMemory) return mastery;
  return mastery * computeOverfitFactor(edgeMemory, edgeRequiredMemory, rho, eps);
}

function edgeOverfitMetrics(memory: number, requiredMemory: number, overfitCoefficient: number): EntityOverfitMetrics {
  const overfitFactor = computeOverfitFactor(memory, requiredMemory, overfitCoefficient);
  return {
    overfitFactor,
    overfitPercent: computeOverfitPercent(overfitFactor),
    effectiveMastery: computeEdgeEffectiveMastery(memory, requiredMemory, overfitCoefficient),
  };
}

export function computeKnowledgeLossReport(
  graph: KnowledgeGraph,
  master: MasterGraph,
  trainEstimate: ReasoningMasteryEstimate,
  valEstimate = trainEstimate,
  datasetSplit?: DatasetSplitResult,
): KnowledgeLossReport {
  const graphNodes = Object.values(graph.nodes);
  const nodeEntries = graphNodes.map((node) => {
    const nodeMaster = master.nodes[node.id];
    const allocatedMemory = Math.max(0, nodeMaster?.memory ?? 0);
    const trainEffectiveRequiredMemory = trainEstimate.effectiveCost[node.id] ?? node.requiredMemory;
    const trainEffectiveMastery = trainEstimate.mastery[node.id] ?? 0;
    const valEffectiveMastery = valEstimate.mastery[node.id] ?? trainEffectiveMastery;
    const overfitFactor = computeOverfitFactor(allocatedMemory, node.requiredMemory, node.overfitCoefficient);
    const trainLoss = computeNodeTrainLoss(trainEffectiveMastery, allocatedMemory, trainEffectiveRequiredMemory, node.lossMin, node.lossMax);
    const valLoss = computeNodeValLoss(valEffectiveMastery, node.lossMin, node.lossMax);

    return [
      node.id,
      {
        overfitFactor,
        overfitPercent: computeOverfitPercent(overfitFactor),
        effectiveMastery: valEffectiveMastery,
        trainLoss,
        valLoss,
      },
    ] as const;
  });

  const nodes = Object.fromEntries(nodeEntries);
  const normalizedSplitWeight = (split: 'train' | 'val') => {
    const weights = graphNodes.map((node) => Math.max(0, datasetSplit?.nodes[node.id]?.[split] ?? node.dataAmount));
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
          master.edges[edge.id]?.memory ?? 0,
          edge.stats.requiredMemory,
          edge.stats.overfitCoefficient,
        ),
      ]),
    ),
  };
}
