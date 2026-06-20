import type { Edge } from '@xyflow/react';
import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';
import { rebuildNodeLinks } from './nodeLinks';

export interface NeuralBlueprintGraphSnapshot {
  nodes: ModuleBaseNode[];
  edges: Edge[];
}

export function createGraphSnapshot(
  nodes: ModuleBaseNode[],
  edges: Edge[],
): NeuralBlueprintGraphSnapshot {
  const snapshotEdges = edges.map(cloneGraphEdge);
  const snapshotNodes = nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: {
      ...node.data,
      position: { ...node.data.position },
    },
  }));

  return {
    nodes: rebuildNodeLinks(snapshotNodes, snapshotEdges),
    edges: snapshotEdges,
  };
}

function cloneGraphEdge(edge: Edge): Edge {
  const snapshotEdge = { ...edge };

  delete snapshotEdge.markerStart;
  delete snapshotEdge.markerEnd;
  delete snapshotEdge.style;

  return snapshotEdge;
}
