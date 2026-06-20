import type { DatasetSplitResult } from './datasetSplit';
import { readEntityMemory } from './masterOperations';
import type { ReasoningMasteryEstimate } from './reasoning';
import { computeExploreBaseWeight } from './trainingUtility';
import type {
  AnyKnowledgeEdge,
  EdgeId,
  KnowledgeGraph,
  MasterGraph,
  NodeId,
} from './types';

export type LossGradient = {
  gradient: number;
  utility: number;
};

export type LossGradientReport = {
  nodes: Record<NodeId, LossGradient>;
  edges: Record<EdgeId, LossGradient>;
};

export function computeLossGradientReport(
  graph: KnowledgeGraph,
  master: MasterGraph,
  estimate: ReasoningMasteryEstimate,
  datasetSplit?: DatasetSplitResult,
): LossGradientReport {
  const nodes = Object.values(graph.nodes);
  const trainAmounts = Object.fromEntries(
    nodes.map((node) => [
      node.id,
      Math.max(0, datasetSplit?.nodes[node.id]?.train ?? node.dataAmount),
    ]),
  ) as Record<NodeId, number>;
  const nodeNeed = Object.fromEntries(
    nodes.map((node) => [
      node.id,
      1 - clamp01(estimate.mastery[node.id] ?? 0),
    ]),
  ) as Record<NodeId, number>;
  const totalTrainData = nodes.reduce(
    (sum, node) => sum + trainAmounts[node.id],
    0,
  );

  return {
    nodes: Object.fromEntries(
      nodes.map((node) => {
        const dataWeight = totalTrainData > 0
          ? trainAmounts[node.id] / totalTrainData
          : 1 / Math.max(1, nodes.length);
        const gradient = -nodeNeed[node.id]
          * dataWeight
          / Math.max(
            1,
            estimate.effectiveCost[node.id] ?? node.requiredMemory,
          );
        return [
          node.id,
          metric(
            gradient,
            computeExploreBaseWeight(node, master, estimate),
            trainAmounts[node.id],
          ),
        ];
      }),
    ),
    edges: edgeMetrics([
      ...graph.depEdges,
      ...graph.subEdges,
      ...graph.interEdges,
    ]),
  };

  function edgeMetrics(edges: AnyKnowledgeEdge[]) {
    return Object.fromEntries(
      edges.map((edge) => [edge.id, edgeMetric(edge)]),
    );
  }

  function edgeMetric(edge: AnyKnowledgeEdge) {
    const need = (
      (nodeNeed[edge.source.id] ?? 0)
      + (nodeNeed[edge.target.id] ?? 0)
    ) / 2;
    const edgeNeed = Math.max(
      0,
      1 - readEntityMemory(master, edge)
        / Math.max(1, edge.stats.requiredMemory),
    );
    const gradient = -need
      * edgeNeed
      / Math.max(1, edge.stats.requiredMemory);
    return metric(
      gradient,
      computeExploreBaseWeight(edge, master, estimate),
      Math.sqrt(
        trainAmounts[edge.source.id] * trainAmounts[edge.target.id],
      ),
    );
  }
}

function metric(
  gradient: number,
  baseWeight: number,
  dataAmount: number,
): LossGradient {
  const utility = (
    Math.log1p(Math.max(0, -gradient))
    + Math.max(0, baseWeight)
  ) * Math.max(0.001, Math.log1p(Math.max(0, dataAmount)));
  return { gradient, utility };
}

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
