import type { Edge } from '@xyflow/react';
import type {
  ModuleBaseNode,
  ModuleNodeData,
  ModuleStats,
} from '../ModuleBaseNodeTypes';

export interface NeuralBlueprintClipboard {
  edges: Edge[];
  nodes: ModuleBaseNode[];
}

export function createNodeClipboard(
  nodes: ModuleBaseNode[],
  edges: Edge[],
): NeuralBlueprintClipboard | null {
  const selectedNodes = nodes.filter((node) => node.selected);
  if (selectedNodes.length === 0) return null;

  const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));

  return {
    nodes: selectedNodes.map(cloneClipboardNode),
    edges: edges
      .filter((edge) => (
        selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
      ))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })),
  };
}

export function pasteNodeClipboard(
  clipboard: NeuralBlueprintClipboard,
  nodes: ModuleBaseNode[],
  edges: Edge[],
  pasteIndex: number,
) {
  const idSuffix = `${Date.now().toString(36)}_${pasteIndex}`;
  const idByCopiedId = new Map(
    clipboard.nodes.map((node, index) => [
      node.id,
      `${node.id}_copy_${idSuffix}_${index}`,
    ]),
  );
  const offset = pasteIndex * 40;
  const pastedNodes = clipboard.nodes.map((node) => {
    const id = idByCopiedId.get(node.id) as string;
    const position = {
      x: node.position.x + offset,
      y: node.position.y + offset,
    };

    return {
      ...node,
      id,
      position,
      selected: true,
      dragging: false,
      data: initializePastedNodeData(node.data, id, position),
    };
  });
  const pastedEdges = clipboard.edges.map((edge) => {
    const source = idByCopiedId.get(edge.source) as string;
    const target = idByCopiedId.get(edge.target) as string;

    return {
      id: `${source}-${target}`,
      source,
      target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    };
  });

  return {
    nodes: [
      ...nodes.map((node) => ({ ...node, selected: false })),
      ...pastedNodes,
    ],
    edges: [...edges, ...pastedEdges],
    pastedNodeIds: pastedNodes.map((node) => node.id),
  };
}

function cloneClipboardNode(node: ModuleBaseNode): ModuleBaseNode {
  return {
    ...node,
    position: { ...node.position },
    data: cloneNodeData(node.data),
  };
}

function initializePastedNodeData(
  data: ModuleNodeData,
  id: string,
  position: { x: number; y: number },
): ModuleNodeData {
  return {
    ...cloneNodeData(data),
    id,
    position,
    predecessors: [],
    successors: [],
    forwardTopologyOrder: 0,
    inferenceTopologyOrder: new Set(),
    backwardTopologyOrder: 0,
    inCycle: false,
    statsBackward: undefined,
    sumInputPairStats: undefined,
    backwardOutputPairStats: undefined,
    memoryPoint: undefined,
    inferencePoint: undefined,
  };
}

function cloneNodeData(data: ModuleNodeData): ModuleNodeData {
  return {
    ...data,
    position: { ...data.position },
    predecessors: [],
    successors: [],
    inferenceTopologyOrder: new Set(data.inferenceTopologyOrder),
    stats: cloneStats(data.stats),
    statsBackward: data.statsBackward
      ? { ...data.statsBackward }
      : undefined,
    sumInputPairStats: data.sumInputPairStats?.map((pair) => ({ ...pair })),
    backwardOutputPairStats: data.backwardOutputPairStats?.map(
      (pair) => ({ ...pair }),
    ),
  };
}

function cloneStats(stats: ModuleStats | undefined) {
  if (!stats) return undefined;

  return {
    ...stats,
    inputElementCorr: stats.inputElementCorr
      ? { ...stats.inputElementCorr }
      : undefined,
    inputLinearCorr: stats.inputLinearCorr
      ? { ...stats.inputLinearCorr }
      : undefined,
  };
}
