import type { Edge } from '@xyflow/react';
import type { ModuleBaseNode, ModuleBaseNodeData } from '../ModuleBaseNodeTypes';

export interface NeuralBlueprintGraphSnapshot {
  nodes: ModuleBaseNode[];
  edges: Edge[];
}

export function createGraphSnapshot(
  nodes: ModuleBaseNode[],
  edges: Edge[],
): NeuralBlueprintGraphSnapshot {
  const snapshotEdges = edges.map((edge) => ({ ...edge }));
  const dataById = new Map<string, ModuleBaseNodeData>();

  nodes.forEach((node) => {
    dataById.set(node.id, {
      ...node.data,
      predecessors: [],
      successors: [],
      position: { ...node.data.position },
    });
  });

  snapshotEdges.forEach((edge) => {
    const source = dataById.get(edge.source);
    const target = dataById.get(edge.target);
    if (!source || !target) return;

    source.successors = [...source.successors, target];
    target.predecessors = [...target.predecessors, source];
  });

  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: dataById.get(node.id) as ModuleBaseNodeData,
    })),
    edges: snapshotEdges,
  };
}
