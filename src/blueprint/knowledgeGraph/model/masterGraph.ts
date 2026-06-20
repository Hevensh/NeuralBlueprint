import type {
  KnowledgeGraph,
  KnowledgeGraphStats,
  KnowledgeMaster,
  MasterGraph,
} from './types';

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function createMaster(id: string): KnowledgeMaster {
  return { id, memory: 0, mastery: 0 };
}

export function createEmptyMasterGraph(
  graph: KnowledgeGraph,
  availableMemoryPoints: number,
  availableReasoningPoints: number,
): MasterGraph {
  const edges = [
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ];
  return {
    nodes: Object.fromEntries(Object.keys(graph.nodes).map((id) => [id, createMaster(id)])),
    edges: Object.fromEntries(edges.map(({ id }) => [id, createMaster(id)])),
    availableMemoryPoints: Math.max(0, Math.floor(availableMemoryPoints)),
    availableReasoningPoints: Math.max(0, Math.floor(availableReasoningPoints)),
  };
}

export function cloneMasterGraph(master: MasterGraph): MasterGraph {
  return {
    nodes: Object.fromEntries(Object.entries(master.nodes).map(([id, node]) => [id, { ...node }])),
    edges: Object.fromEntries(Object.entries(master.edges).map(([id, edge]) => [id, { ...edge }])),
    availableMemoryPoints: master.availableMemoryPoints,
    availableReasoningPoints: master.availableReasoningPoints,
  };
}

export function updateOwnMasteries(graph: KnowledgeGraph, master: MasterGraph): MasterGraph {
  const next = cloneMasterGraph(master);

  Object.values(graph.nodes).forEach((node) => {
    const nodeMaster = next.nodes[node.id];
    if (nodeMaster) nodeMaster.mastery = clamp01(nodeMaster.memory / node.requiredMemory);
  });

  [
    ...graph.depEdges,
    ...graph.subEdges,
    ...graph.interEdges,
  ].forEach((edge) => {
    const edgeMaster = next.edges[edge.id];
    if (edgeMaster) edgeMaster.mastery = clamp01(edgeMaster.memory / edge.stats.requiredMemory);
  });

  return next;
}

function calculateMaxDependencyDepth(graph: KnowledgeGraph): number {
  const incoming = graph.depEdges.reduce((map, edge) => {
    const sources = map.get(edge.target.id) ?? [];
    sources.push(edge.source.id);
    map.set(edge.target.id, sources);
    return map;
  }, new Map<string, string[]>());
  const memo = new Map<string, number>();

  const depthOf = (nodeId: string, visiting = new Set<string>()): number => {
    const cached = memo.get(nodeId);
    if (cached !== undefined) return cached;
    if (visiting.has(nodeId)) return 0;

    const nextVisiting = new Set(visiting);
    nextVisiting.add(nodeId);
    const depth = (incoming.get(nodeId) ?? []).reduce((maxDepth, sourceId) => Math.max(maxDepth, 1 + depthOf(sourceId, nextVisiting)), 0);
    memo.set(nodeId, depth);
    return depth;
  };

  return Object.keys(graph.nodes).reduce((maxDepth, nodeId) => Math.max(maxDepth, depthOf(nodeId)), 0);
}

export function calculateKnowledgeStats(graph: KnowledgeGraph, master: MasterGraph): KnowledgeGraphStats {
  const totalRequiredNodeMemory = Object.values(graph.nodes).reduce((sum, node) => sum + node.requiredMemory, 0);
  const depRequired = graph.depEdges.reduce((sum, edge) => sum + edge.stats.requiredMemory, 0);
  const subRequired = graph.subEdges.reduce((sum, edge) => sum + edge.stats.requiredMemory, 0);
  const interRequired = graph.interEdges.reduce((sum, edge) => sum + edge.stats.requiredMemory, 0);
  const totalAllocatedNodeMemory = Object.values(master.nodes).reduce((sum, node) => sum + node.memory, 0);
  const totalAllocatedEdgeMemory = Object.values(master.edges)
    .reduce((sum, edge) => sum + edge.memory, 0);
  const usedMemoryPoints = totalAllocatedNodeMemory + totalAllocatedEdgeMemory;

  return {
    nodeCount: Object.keys(graph.nodes).length,
    dependencyEdgeCount: graph.depEdges.length,
    substituteEdgeCount: graph.subEdges.length,
    interferenceEdgeCount: graph.interEdges.length,
    totalRequiredNodeMemory,
    totalRequiredEdgeMemory: depRequired + subRequired + interRequired,
    totalAllocatedNodeMemory,
    totalAllocatedEdgeMemory,
    availableMemoryPoints: master.availableMemoryPoints,
    usedMemoryPoints,
    remainingMemoryPoints: master.availableMemoryPoints - usedMemoryPoints,
    availableReasoningPoints: master.availableReasoningPoints,
    maxDependencyDepth: calculateMaxDependencyDepth(graph),
  };
}
