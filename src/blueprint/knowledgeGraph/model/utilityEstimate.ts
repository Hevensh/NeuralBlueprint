import type { DatasetSplitResult } from './datasetSplit';
import type {
  ReasoningMasteryEstimate,
  ReasoningStageEstimate,
} from './reasoning';
import type {
  AnyKnowledgeEdge,
  EdgeId,
  KnowledgeGraphDefinition,
  KnowledgeNode,
  NodeId,
} from './types';

export type UtilityEstimate = {
  self: number;
  adjacent: number;
  total: number;
};

export type StageUtilityReport = {
  stage: number;
  nodes: Record<NodeId, UtilityEstimate>;
  edges: Record<EdgeId, UtilityEstimate>;
};

export type UtilityReport = {
  stages: StageUtilityReport[];
};

type RawUtility = {
  self: number;
  adjacent: number;
};

const EPS = 1e-9;
const OVERFIT_WEIGHT = 0;

export function estimateUtilityReport(
  graph: KnowledgeGraphDefinition,
  reasoning: ReasoningMasteryEstimate,
  datasetSplit?: DatasetSplitResult,
): UtilityReport {
  const nodes = Object.values(graph.nodes);
  const edges = allEdges(graph);
  const weights = trainWeights(nodes, datasetSplit);
  const nodeStages = reasoning.stages.map((_stage, index) => (
    Object.fromEntries(nodes.map((node) => [
      node.id,
      nodeUtility(
        node,
        reasoning.stages[index],
        weights[node.id],
      ),
    ])) as Record<NodeId, RawUtility>
  ));
  reasoning.stages.forEach((stage, index) => {
    graph.depEdges.forEach((edge) => {
      const sourceUtility = nodeStages[index][edge.source.id];
      if (!sourceUtility) return;
      const sourceGap = 1 - mastery(stage, edge.source);
      const targetGap = 1 - mastery(stage, edge.target);
      sourceUtility.adjacent += positive(
        sourceGap * targetGap * (weights[edge.target.id] ?? 0),
      );
    });
  });
  const rawStages = reasoning.stages.map((stage, index) => ({
      stage: stage.stage,
      nodes: nodeStages[index],
      edges: Object.fromEntries(edges.map((edge) => [
        edge.id,
        edgeUtility(
          edge,
          stage,
          weights,
        ),
      ])) as Record<EdgeId, RawUtility>,
    }));
  return {
    stages: rawStages.map((stage) => ({
      stage: stage.stage,
      nodes: utilityRecord(stage.nodes),
      edges: utilityRecord(stage.edges),
    })),
  };
}

function nodeUtility(
  node: KnowledgeNode,
  stage: ReasoningStageEstimate,
  weight: number,
): RawUtility {
  const masteryGap = 1 - mastery(stage, node);
  const overfitRate = clamp01(stage.overfitRate[node.id] ?? 0);
  const cost = effectiveCost(stage, node);
  return {
    self: positive(
      weight * (
        masteryGap + OVERFIT_WEIGHT * (1 - overfitRate)
      ) / cost,
    ),
    adjacent: 0,
  };
}

function edgeUtility(
  edge: AnyKnowledgeEdge,
  stage: ReasoningStageEstimate,
  weights: Record<NodeId, number>,
): RawUtility {
  const edgeM = clamp01(stage.edges[edge.id]?.mastery ?? 0);
  const sourceM = mastery(stage, edge.source);
  const targetM = mastery(stage, edge.target);
  const sourceW = weights[edge.source.id] ?? 0;
  const targetW = weights[edge.target.id] ?? 0;
  const sourceCost = effectiveCost(stage, edge.source);
  const targetCost = effectiveCost(stage, edge.target);
  const lambda = positive(edge.properties.lambda);
  const edgeOverfit = clamp01(
    stage.edges[edge.id]?.overfitRate ?? 0,
  );
  const edgeNeed = (
    lambda * (1 - edgeM)
    + OVERFIT_WEIGHT * (1 - edgeOverfit)
  ) / Math.max(EPS, edge.properties.requiredMemory);
  let adjacent: number;

  if (edge.kind === 'dependency') {
    adjacent = sourceM * targetW;
  } else if (edge.kind === 'substitute') {
    adjacent = substitute(
      sourceM,
      targetM,
      targetW,
      sourceCost,
      targetCost,
    ) + substitute(
      targetM,
      sourceM,
      sourceW,
      targetCost,
      sourceCost,
    );
  } else {
    const gamma = 1 - Math.exp(
      -Math.max(
        0,
        edge.source.requiredMemory + edge.target.requiredMemory - 24,
      ) / 36,
    );
    adjacent = interference(
      sourceM,
      targetM,
      targetW,
      gamma,
    ) + interference(
      targetM,
      sourceM,
      sourceW,
      gamma,
    );
  }

  return {
    self: 0,
    adjacent: positive(adjacent * edgeNeed),
  };
}

function substitute(
  sourceM: number,
  targetM: number,
  targetWeight: number,
  sourceCost: number,
  targetCost: number,
) {
  return sourceM * targetWeight * (1 - targetM)
    * quality(sourceCost, targetCost);
}

function interference(
  sourceM: number,
  targetM: number,
  targetWeight: number,
  gamma: number,
) {
  return gamma * (1 - sourceM) * targetWeight * targetM;
}

function utilityRecord<Id extends string>(
  values: Record<Id, RawUtility>,
) {
  return Object.fromEntries((Object.keys(values) as Id[]).map((id) => {
    const raw = values[id];
    const self = positive(raw.self);
    const adjacent = positive(raw.adjacent);
    const total = self + adjacent;
    return [id, {
      self,
      adjacent,
      total,
    }];
  })) as Record<Id, UtilityEstimate>;
}

function trainWeights(
  nodes: KnowledgeNode[],
  datasetSplit?: DatasetSplitResult,
) {
  return Object.fromEntries(nodes.map((node) => [
    node.id,
    positive(datasetSplit?.nodes[node.id]?.train ?? node.dataAmount) + 1,
  ])) as Record<NodeId, number>;
}

function mastery(stage: ReasoningStageEstimate, node: KnowledgeNode) {
  return clamp01(stage.mastery[node.id] ?? 0);
}

function effectiveCost(
  stage: ReasoningStageEstimate,
  node: KnowledgeNode,
) {
  return Math.max(EPS, positive(
    stage.effectiveCost[node.id] ?? node.requiredMemory,
  ));
}

function quality(sourceCost: number, targetCost: number) {
  return clamp01(safeDiv(sourceCost, targetCost));
}

function safeDiv(value: number, divisor: number) {
  return divisor > EPS ? positive(value / divisor) : 0;
}

function positive(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp01(value: number) {
  return Math.min(1, positive(value));
}

function allEdges(graph: KnowledgeGraphDefinition) {
  return [...graph.depEdges, ...graph.subEdges, ...graph.interEdges];
}
