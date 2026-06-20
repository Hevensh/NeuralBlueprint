import {
  computeEdgeEffectiveMastery,
  computeEdgeMastery,
  computeOverfitFactor,
} from './lossMetrics';
import type {
  DependencyEdge,
  InterferenceEdge,
  KnowledgeGraph,
  KnowledgeNode,
  MasterGraph,
  NodeId,
  SubstituteEdge,
} from './types';

const GENERATED_NODE_COST_MIN = 24;
const GENERATED_NODE_COST_MAX = 36;

export type ReasoningMasteryEstimate = {
  mastery: Record<NodeId, number>;
  effectiveCost: Record<NodeId, number>;
};

export type ReasoningMode = 'train' | 'val';

export function estimateMasteryWithReasoningBudget(
  graph: KnowledgeGraph,
  master: MasterGraph,
  maxReasoningPoints: number,
  mode: ReasoningMode = 'val',
): ReasoningMasteryEstimate {
  const nodes = Object.values(graph.nodes);
  const incoming = dependencyEdgesByTarget(graph.depEdges);
  let effectiveCost = zeroActivationCosts(nodes, incoming);
  let mastery = relationPass(
    graph,
    master,
    baseMastery(nodes, master, effectiveCost, mode),
    effectiveCost,
    mode,
  );

  for (
    let budget = 0;
    budget < Math.max(0, Math.floor(maxReasoningPoints));
    budget += 1
  ) {
    effectiveCost = nextDependencyCosts(
      nodes,
      incoming,
      master,
      effectiveCost,
      mastery,
      mode,
    );
    mastery = relationPass(
      graph,
      master,
      baseMastery(nodes, master, effectiveCost, mode),
      effectiveCost,
      mode,
    );
  }

  return { mastery, effectiveCost };
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
          + Math.max(0, edge.stats.lambda)
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
  master: MasterGraph,
  currentCosts: Record<NodeId, number>,
  currentMastery: Record<NodeId, number>,
  mode: ReasoningMode,
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
              masteryOf(edge, master, mode)
                * (currentMastery[edge.source.id] ?? 0),
            );
            return sum
              + Math.max(0, edge.stats.lambda)
                * (1 - activation)
                * Math.log(sourceCost);
          }, 0);
      return [node.id, safeExp(logCost)];
    }),
  );
}

function baseMastery(
  nodes: KnowledgeNode[],
  master: MasterGraph,
  costs: Record<NodeId, number>,
  mode: ReasoningMode,
) {
  return Object.fromEntries(
    nodes.map((node) => {
      const memory = Math.max(0, master.nodes[node.id]?.memory ?? 0);
      const mastery = clamp01(memory / Math.max(0.001, costs[node.id] ?? 1));
      return [
        node.id,
        mode === 'train'
          ? mastery
          : clamp01(
            mastery * computeOverfitFactor(
              memory,
              node.requiredMemory,
              node.overfitCoefficient,
            ),
          ),
      ];
    }),
  );
}

function relationPass(
  graph: KnowledgeGraph,
  master: MasterGraph,
  input: Record<NodeId, number>,
  costs: Record<NodeId, number>,
  mode: ReasoningMode,
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
    const damage = interferenceDamage(edge, master, mode);
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
      Math.log1p(costs[source.id] ?? 1)
      / Math.log1p(costs[target.id] ?? 1)
      * edgeInfluence(
        masteryOf(edge, master, mode),
        edge.stats.lambda,
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

function masteryOf(
  edge: DependencyEdge | SubstituteEdge | InterferenceEdge,
  master: MasterGraph,
  mode: ReasoningMode,
) {
  return masteryFromMemory(
    master.edges[edge.id]?.memory ?? 0,
    edge.stats.requiredMemory,
    edge.stats.overfitCoefficient,
    mode,
  );
}

function interferenceDamage(
  edge: InterferenceEdge,
  master: MasterGraph,
  mode: ReasoningMode,
) {
  const gamma = clamp01(
    1 - Math.exp(
      -Math.max(
        0,
        edge.source.requiredMemory
          + edge.target.requiredMemory
          - GENERATED_NODE_COST_MIN,
      ) / GENERATED_NODE_COST_MAX,
    ),
  );
  const edgeProtection = Math.pow(
    masteryOf(edge, master, mode),
    Math.max(0, edge.stats.lambda),
  );
  return clamp01(gamma * (1 - edgeProtection));
}

function masteryFromMemory(
  memory: number,
  requiredMemory: number,
  overfitCoefficient: number,
  mode: ReasoningMode,
) {
  return mode === 'train'
    ? computeEdgeMastery(memory, requiredMemory)
    : computeEdgeEffectiveMastery(
      memory,
      requiredMemory,
      overfitCoefficient,
    );
}

function edgeInfluence(edgeMasteryValue: number, lambda: number) {
  return 1 - Math.pow(1 - clamp01(edgeMasteryValue), Math.max(0, lambda));
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
