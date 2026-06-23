import type {
  KnowledgeGraphDefinition,
  KnowledgeEntity,
  NodeId,
} from './types';

export function calculateNodeDependencyDepths(graph: KnowledgeGraphDefinition) {
  const incoming = graph.depEdges.reduce((map, edge) => {
    map.set(edge.target.id, [
      ...(map.get(edge.target.id) ?? []),
      edge.source.id,
    ]);
    return map;
  }, new Map<NodeId, NodeId[]>());
  const depths = new Map<NodeId, number>();

  const depthOf = (nodeId: NodeId, visiting = new Set<NodeId>()): number => {
    const cached = depths.get(nodeId);
    if (cached !== undefined) return cached;
    if (visiting.has(nodeId)) return 0;
    const nextVisiting = new Set(visiting).add(nodeId);
    const depth = (incoming.get(nodeId) ?? []).reduce(
      (max, sourceId) => Math.max(max, depthOf(sourceId, nextVisiting) + 1),
      0,
    );
    depths.set(nodeId, depth);
    return depth;
  };

  Object.keys(graph.nodes).forEach((nodeId) => depthOf(nodeId));
  return depths;
}

export function calculateMaxDependencyDepth(graph: KnowledgeGraphDefinition) {
  return Math.max(0, ...calculateNodeDependencyDepths(graph).values());
}

export function entityDependencyStage(
  entity: KnowledgeEntity,
  depths: Map<NodeId, number>,
  lastStage: number,
) {
  if (entity.kind === 'node') {
    return clampStage(depths.get(entity.id) ?? 0, lastStage);
  }
  if (entity.kind === 'dependency') {
    return clampStage(
      Math.max(0, (depths.get(entity.target.id) ?? 0) - 1),
      lastStage,
    );
  }
  if (entity.kind === 'interference') {
    return clampStage(
      Math.min(
        depths.get(entity.source.id) ?? 0,
        depths.get(entity.target.id) ?? 0,
      ),
      lastStage,
    );
  }
  return clampStage(
    Math.max(
      depths.get(entity.source.id) ?? 0,
      depths.get(entity.target.id) ?? 0,
    ),
    lastStage,
  );
}

function clampStage(stage: number, lastStage: number) {
  return Math.max(0, Math.min(lastStage, stage));
}
