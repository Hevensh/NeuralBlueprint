import {
  computeOverfitRate,
} from './lossMetrics';
import {
  readEntityMemoryThroughStage,
  readEntityStageMemory,
} from './memoryOperations';
import type {
  DependencyEdge,
  EdgeId,
  InterferenceEdge,
  AnyKnowledgeEdge,
  KnowledgeGraphDefinition,
  KnowledgeNode,
  KnowledgeGraphMemory,
  NodeId,
  SubstituteEdge,
} from './types';

const GENERATED_NODE_COST_MIN = 24;
const GENERATED_NODE_COST_MAX = 36;

export type ReasoningStageEstimate = {
  stage: number;
  mastery: Record<NodeId, number>;
  effectiveCost: Record<NodeId, number>;
  adjustedMemory: Record<NodeId, number>;
  overfitRate: Record<NodeId, number>;
  edges: Record<EdgeId, ReasoningEdgeEstimate>;
};

export type ReasoningEdgeEstimate = {
  allocatedMemory: number;
  equivalentMemory: number;
  mastery: number;
  overfitRate: number;
};

export type ReasoningMasteryEstimate = {
  mastery: Record<NodeId, number>;
  effectiveCost: Record<NodeId, number>;
  stages: ReasoningStageEstimate[];
};

export type ReasoningMode = 'train' | 'val';

export function estimateStagedMastery(
  graph: KnowledgeGraphDefinition,
  memory: KnowledgeGraphMemory,
  mode: ReasoningMode = 'val',
): ReasoningMasteryEstimate {
  const nodes = Object.values(graph.nodes);
  const edges = [
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ];
  const incoming = dependencyEdgesByTarget(graph.depEdges);
  const lastStage = memory.availableReasoningPoints;
  let effectiveCost = zeroActivationCosts(nodes, incoming);
  let adjustedMemory = nextNodeMemory(
    nodes,
    memory,
    0,
    effectiveCost,
  );
  let overfitRate = nodeOverfitRates(
    nodes,
    memory,
    0,
    effectiveCost,
  );
  let edgeEstimates = nextEdgeEstimates(edges, memory, 0, mode);
  let preRelationMastery = baseMastery(
    nodes,
    adjustedMemory,
    effectiveCost,
    overfitRate,
    mode,
  );
  let mastery = relationPass(
    graph,
    preRelationMastery,
    effectiveCost,
    edgeEstimates,
  );

  // The simplified game model has one global inference state. Apply the
  // dependency relief once before measuring mastery so pretrained edge memory
  // still makes downstream concepts cheaper to learn without a stage loop.
  if (lastStage === 0) {
    effectiveCost = nextDependencyCosts(
      nodes,
      incoming,
      effectiveCost,
      mastery,
      edgeEstimates,
    );
    adjustedMemory = nextNodeMemory(
      nodes,
      memory,
      0,
      effectiveCost,
    );
    overfitRate = nodeOverfitRates(
      nodes,
      memory,
      0,
      effectiveCost,
    );
    preRelationMastery = baseMastery(
      nodes,
      adjustedMemory,
      effectiveCost,
      overfitRate,
      mode,
    );
    mastery = relationPass(
      graph,
      preRelationMastery,
      effectiveCost,
      edgeEstimates,
    );
  }

  const stages: ReasoningStageEstimate[] = [
    stageEstimate(
      0,
      mastery,
      effectiveCost,
      adjustedMemory,
      overfitRate,
      edgeEstimates,
    ),
  ];

  for (let stage = 1; stage <= lastStage; stage += 1) {
    effectiveCost = nextDependencyCosts(
      nodes,
      incoming,
      effectiveCost,
      mastery,
      edgeEstimates,
    );
    adjustedMemory = nextNodeMemory(
      nodes,
      memory,
      stage,
      effectiveCost,
      mastery,
    );
    overfitRate = nodeOverfitRates(
      nodes,
      memory,
      stage,
      effectiveCost,
    );
    edgeEstimates = nextEdgeEstimates(
      edges,
      memory,
      stage,
      mode,
      edgeEstimates,
    );
    preRelationMastery = baseMastery(
      nodes,
      adjustedMemory,
      effectiveCost,
      overfitRate,
      mode,
    );
    mastery = relationPass(
      graph,
      preRelationMastery,
      effectiveCost,
      edgeEstimates,
    );
    stages.push(stageEstimate(
      stage,
      mastery,
      effectiveCost,
      adjustedMemory,
      overfitRate,
      edgeEstimates,
    ));
  }

  const final = stages.at(-1) ?? {
    stage: 0,
    mastery: {},
    effectiveCost: {},
    adjustedMemory: {},
    overfitRate: {},
    edges: {},
  };
  return {
    mastery: final.mastery,
    effectiveCost: final.effectiveCost,
    stages,
  };
}

function stageEstimate(
  stage: number,
  mastery: Record<NodeId, number>,
  effectiveCost: Record<NodeId, number>,
  adjustedMemory: Record<NodeId, number>,
  overfitRate: Record<NodeId, number>,
  edges: Record<EdgeId, ReasoningEdgeEstimate>,
): ReasoningStageEstimate {
  return {
    stage,
    mastery,
    effectiveCost,
    adjustedMemory,
    overfitRate,
    edges,
  };
}

function nextEdgeEstimates(
  edges: AnyKnowledgeEdge[],
  memory: KnowledgeGraphMemory,
  stage: number,
  mode: ReasoningMode,
  previous: Record<EdgeId, ReasoningEdgeEstimate> = {},
) {
  return Object.fromEntries(edges.map((edge) => {
    const required = Math.max(0.001, edge.properties.requiredMemory);
    const equivalentMemory = (
      (previous[edge.id]?.mastery ?? 0) * required
      + readEntityStageMemory(memory, edge, stage)
    );
    const allocatedMemory = readEntityMemoryThroughStage(memory, edge, stage);
    const overfitRate = computeOverfitRate(
      allocatedMemory,
      edge.properties.requiredMemory,
      edge.properties.overfitCoefficient,
    );
    return [
      edge.id,
      {
        allocatedMemory,
        equivalentMemory,
        overfitRate,
        mastery: effectiveMastery(
          equivalentMemory,
          required,
          overfitRate,
          mode,
        ),
      },
    ];
  })) as Record<EdgeId, ReasoningEdgeEstimate>;
}

function nextNodeMemory(
  nodes: KnowledgeNode[],
  memory: KnowledgeGraphMemory,
  stage: number,
  costs: Record<NodeId, number>,
  previousMastery: Record<NodeId, number> = {},
) {
  return Object.fromEntries(
    nodes.map((node) => [
      node.id,
      (previousMastery[node.id] ?? 0)
        * Math.max(0.001, costs[node.id] ?? node.requiredMemory)
        + readEntityStageMemory(memory, node, stage),
    ]),
  );
}

function nodeOverfitRates(
  nodes: KnowledgeNode[],
  memory: KnowledgeGraphMemory,
  stage: number,
  costs: Record<NodeId, number>,
) {
  return Object.fromEntries(nodes.map((node) => [
    node.id,
    computeOverfitRate(
      readEntityMemoryThroughStage(memory, node, stage),
      costs[node.id] ?? node.requiredMemory,
      node.overfitCoefficient,
    ),
  ]));
}

function dependencyEdgesByTarget(edges: DependencyEdge[]) {
  const incoming = new Map<NodeId, DependencyEdge[]>();
  edges.forEach((edge) => {
    incoming.set(edge.target.id, [
      ...(incoming.get(edge.target.id) ?? []),
      edge,
    ]);
  });
  return incoming;
}

function zeroActivationCosts(
  nodes: KnowledgeNode[],
  incoming: Map<NodeId, DependencyEdge[]>,
) {
  const cache = new Map<NodeId, number>();
  const logCost = (
    node: KnowledgeNode,
    visiting = new Set<NodeId>(),
  ): number => {
    const cached = cache.get(node.id);
    if (cached !== undefined) return cached;
    if (visiting.has(node.id)) {
      return Math.log(Math.max(0.001, node.requiredMemory));
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(node.id);
    const value = Math.log(Math.max(0.001, node.requiredMemory))
      + (incoming.get(node.id) ?? []).reduce(
        (sum, edge) => sum
          + Math.max(0, edge.properties.lambda)
            * logCost(edge.source, nextVisiting),
        0,
      );
    cache.set(node.id, value);
    return value;
  };

  return Object.fromEntries(
    nodes.map((node) => [node.id, safeExp(logCost(node))]),
  );
}

function nextDependencyCosts(
  nodes: KnowledgeNode[],
  incoming: Map<NodeId, DependencyEdge[]>,
  currentCosts: Record<NodeId, number>,
  currentMastery: Record<NodeId, number>,
  edgeEstimates: Record<EdgeId, ReasoningEdgeEstimate>,
) {
  return Object.fromEntries(
    nodes.map((node) => {
      const logCost = Math.log(Math.max(0.001, node.requiredMemory))
        + (incoming.get(node.id) ?? [])
          .reduce((sum, edge) => {
            const sourceCost = Math.max(
              0.001,
              currentCosts[edge.source.id]
                ?? edge.source.requiredMemory,
            );
            const activation = clamp01(
              (edgeEstimates[edge.id]?.mastery ?? 0)
                * (currentMastery[edge.source.id] ?? 0),
            );
            return sum
              + Math.max(0, edge.properties.lambda)
                * (1 - activation)
                * Math.log(sourceCost);
          }, 0);
      return [node.id, safeExp(logCost)];
    }),
  );
}

function baseMastery(
  nodes: KnowledgeNode[],
  adjustedMemory: Record<NodeId, number>,
  costs: Record<NodeId, number>,
  overfitRates: Record<NodeId, number>,
  mode: ReasoningMode,
) {
  return Object.fromEntries(
    nodes.map((node) => {
      const mastery = clamp01(
        (adjustedMemory[node.id] ?? 0)
        / Math.max(0.001, costs[node.id] ?? node.requiredMemory),
      );
      return [node.id, mode === 'train'
        ? mastery
        : mastery * (1 - (overfitRates[node.id] ?? 0))];
    }),
  );
}

function relationPass(
  graph: KnowledgeGraphDefinition,
  input: Record<NodeId, number>,
  costs: Record<NodeId, number>,
  edges: Record<EdgeId, ReasoningEdgeEstimate>,
) {
  const nodes = Object.values(graph.nodes);
  const substituteProducts = emptyProducts(nodes);
  graph.subEdges.forEach((edge) => {
    addSubstitute(edge.source, edge.target, edge);
    addSubstitute(edge.target, edge.source, edge);
  });
  const substituted = Object.fromEntries(
    nodes.map((node) => [
      node.id,
      clamp01(
        1 - (1 - (input[node.id] ?? 0)) * substituteProducts[node.id],
      ),
    ]),
  );

  const interferenceProducts = emptyProducts(nodes);
  graph.interEdges.forEach((edge) => {
    const damage = interferenceDamage(
      edge,
      edges[edge.id]?.mastery ?? 0,
    );
    addDamage(edge.source.id, edge.target.id, damage);
    addDamage(edge.target.id, edge.source.id, damage);
  });

  return Object.fromEntries(
    nodes.map((node) => [
      node.id,
      clamp01(
        (substituted[node.id] ?? 0) * interferenceProducts[node.id],
      ),
    ]),
  );

  function addSubstitute(
    source: KnowledgeNode,
    target: KnowledgeNode,
    edge: SubstituteEdge,
  ) {
    const quality = clamp01(
      (costs[source.id] ?? 1)
      / Math.max(0.001, costs[target.id] ?? 1)
      * computeEdgeInfluence(
        edges[edge.id]?.mastery ?? 0,
        edge.properties.lambda,
      ),
    );
    substituteProducts[target.id] *= 1
      - clamp01(quality * (input[source.id] ?? 0));
  }

  function addDamage(sourceId: NodeId, targetId: NodeId, damage: number) {
    interferenceProducts[targetId] *= 1
      - clamp01(damage * (1 - (substituted[sourceId] ?? 0)));
  }
}

function interferenceDamage(
  edge: InterferenceEdge,
  edgeMastery: number,
) {
  const gamma = computeInterferenceGamma(edge);
  const edgeProtection = Math.pow(
    edgeMastery,
    Math.max(0, edge.properties.lambda),
  );
  return clamp01(gamma * (1 - edgeProtection));
}

function effectiveMastery(
  equivalentMemory: number,
  effectiveRequiredMemory: number,
  overfitRate: number,
  mode: ReasoningMode,
) {
  const mastery = clamp01(
    equivalentMemory / Math.max(0.001, effectiveRequiredMemory),
  );
  return mode === 'train'
    ? mastery
    : clamp01(mastery * (1 - overfitRate));
}

export function computeEdgeInfluence(
  edgeMasteryValue: number,
  lambda: number,
) {
  return 1 - Math.pow(1 - clamp01(edgeMasteryValue), Math.max(0, lambda));
}

export function computeInterferenceGamma(edge: InterferenceEdge) {
  return clamp01(
    1 - Math.exp(
      -Math.max(
        0,
        edge.source.requiredMemory
          + edge.target.requiredMemory
          - GENERATED_NODE_COST_MIN,
      ) / GENERATED_NODE_COST_MAX,
    ),
  );
}

function emptyProducts(nodes: KnowledgeNode[]): Record<NodeId, number> {
  return Object.fromEntries(nodes.map((node) => [node.id, 1]));
}

function safeExp(value: number) {
  return Math.exp(Math.min(value, Math.log(Number.MAX_SAFE_INTEGER)));
}

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
