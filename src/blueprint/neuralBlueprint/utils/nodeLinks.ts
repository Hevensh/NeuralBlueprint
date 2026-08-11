import type { Edge } from '@xyflow/react';
import type { ModuleBaseNode, ModuleNodeData } from '../ModuleBaseNodeTypes';

export function rebuildNodeLinks(
  nodes: ModuleBaseNode[],
  edges: Edge[],
): ModuleBaseNode[] {
  const dataById = new Map<string, ModuleNodeData>();

  nodes.forEach((node) => {
    dataById.set(node.id, {
      ...node.data,
      links: { predecessorIds: [], successorIds: [] },
      predecessors: [],
      successors: [],
    });
  });

  edges.forEach((edge) => {
    const source = dataById.get(edge.source);
    const target = dataById.get(edge.target);
    if (!source || !target) return;

    source.links.successorIds.push(target.id);
    target.links.predecessorIds.push(source.id);
    source.successors.push(target);
    target.predecessors.push(source);
  });

  return nodes.map((node) => ({
    ...node,
    data: dataById.get(node.id) as ModuleNodeData,
  }));
}
