import type { Edge } from '@xyflow/react';
import type { ModuleBaseNode, ModuleBaseNodeData } from '../ModuleBaseNodeTypes';

export function addEdgeLink(
  nodes: ModuleBaseNode[],
  sourceData: ModuleBaseNodeData,
  targetData: ModuleBaseNodeData,
): ModuleBaseNode[] {
  const nextSourceData = {
    ...sourceData,
    successors: [...sourceData.successors, targetData],
  };
  const nextTargetData = {
    ...targetData,
    predecessors: [...targetData.predecessors, sourceData],
  };

  nextSourceData.successors = nextSourceData.successors.map((successor) => (
    successor.id === nextTargetData.id ? nextTargetData : successor
  ));
  nextTargetData.predecessors = nextTargetData.predecessors.map((predecessor) => (
    predecessor.id === nextSourceData.id ? nextSourceData : predecessor
  ));

  return nodes.map((node) => ({
    ...node,
    data: node.data.id === nextSourceData.id
      ? nextSourceData
      : node.data.id === nextTargetData.id
        ? nextTargetData
        : node.data,
  }));
}

export function removeEdgeLinks(
  nodes: ModuleBaseNode[],
  removedEdges: Edge[],
): ModuleBaseNode[] {
  return nodes.map((node) => {
    const removedSuccessorIds = removedEdges
      .filter((edge) => edge.source === node.id)
      .map((edge) => edge.target);
    const removedPredecessorIds = removedEdges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.source);

    if (removedSuccessorIds.length === 0 && removedPredecessorIds.length === 0) {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        successors: node.data.successors.filter((successor) => (
          !removedSuccessorIds.includes(successor.id)
        )),
        predecessors: node.data.predecessors.filter((predecessor) => (
          !removedPredecessorIds.includes(predecessor.id)
        )),
      },
    };
  });
}

export function removeNodeLinks(
  nodes: ModuleBaseNode[],
  removedNodeIds: Set<string>,
): ModuleBaseNode[] {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      successors: node.data.successors.filter((successor) => (
        !removedNodeIds.has(successor.id)
      )),
      predecessors: node.data.predecessors.filter((predecessor) => (
        !removedNodeIds.has(predecessor.id)
      )),
    },
  }));
}
