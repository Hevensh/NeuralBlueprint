import {
  Background,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  useViewport,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { type Dispatch, type DragEvent, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadNeuralBlueprintGraph,
  saveNeuralBlueprintGraph,
} from '../../dataStorage/neuralBlueprintStorage';
import { PageType } from '../PageTypes';
import { updateState } from './analysis/updateState';
import {
  MODULE_BASE_NODE_DRAG_TYPE,
} from './NeuralBlueprintLeftPanel';
import { NeuralBlueprintNode } from './NeuralBlueprintNode';
import type {
  ModuleAnalysisDirection,
  ModuleBaseNode,
  ModuleBaseNodeKind,
  ModuleNodeData,
} from './ModuleBaseNodeTypes';
import {
  createModuleNodeData,
  isModuleBaseNodeKind,
} from './moduleNodeFactory';
import {
  animateNodePositions,
  easeArrangeAnimation,
  getArrangeAnimationDuration,
  getTargetNodeBounds,
  type CancelNodePositionAnimation,
} from './utils/animateNodePositions';
import { arrangeModuleNodes } from './utils/arrangeNodes';
import { createCorrelationLines } from './utils/correlationLines';
import { CorrelationOverlay } from './utils/correlationOverlay';
import {
  createGraphSnapshot,
  type NeuralBlueprintGraphSnapshot,
} from './utils/graphSnapshot';
import {
  rebuildNodeLinks,
} from './utils/nodeLinks';
import {
  createNodeClipboard,
  pasteNodeClipboard,
  type NeuralBlueprintClipboard,
} from './utils/nodeClipboard';
import { syncSelectedNode } from './utils/selection';

const baseEdgeOptions = {
  type: 'smoothstep',
  pathOptions: {
    borderRadius: 24,
  },
};

const nodeTypes = {
  [PageType.NeuralBlueprint]: NeuralBlueprintNode,
};

interface NeuralBlueprintCanvasInnerProp {
  arrangeRequest: number;
  analysisDirection: ModuleAnalysisDirection;
  fileId: string;
  showRankAnalysis: boolean;
  showVarianceAnalysis: boolean;
  setSelectedNode: Dispatch<SetStateAction<ModuleNodeData | null>>;
}

export function NeuralBlueprintCanvasInner({
  arrangeRequest,
  analysisDirection,
  fileId,
  showRankAnalysis,
  showVarianceAnalysis,
  setSelectedNode,
}: NeuralBlueprintCanvasInnerProp) {
  const {
    fitBounds,
    getViewport,
    screenToFlowPosition,
    setViewport,
  } = useReactFlow<ModuleBaseNode, Edge>();
  const viewport = useViewport();
  const [initialGraph] = useState(() => {
    const graph = loadNeuralBlueprintGraph(fileId);
    return {
      ...graph,
      nodes: updateState(graph.nodes),
    };
  });
  const [nodes, setNodes, onNodesChange] = useNodesState<ModuleBaseNode>(initialGraph.nodes);
  const [edges, setEdges] = useEdgesState<Edge>(initialGraph.edges);
  const [hoveredCorrelationNodeKey, setHoveredCorrelationNodeKey] = useState<string | null>(null);
  const historyRef = useRef<NeuralBlueprintGraphSnapshot[]>([]);
  const hoverTimerRef = useRef<number | null>(null);
  const handledArrangeRequestRef = useRef(0);
  const cancelNodeAnimationRef = useRef<CancelNodePositionAnimation>(() => undefined);
  const clipboardRef = useRef<NeuralBlueprintClipboard | null>(null);
  const pasteIndexRef = useRef(0);
  const selectedNodeIdRef = useRef<string | null>(null);
  const selectedCorrelationNode = useMemo(() => (
    nodes.find((node) => (
      node.selected && hasCorrelationPairs(node, analysisDirection)
    )) ?? null
  ), [analysisDirection, nodes]);
  const visibleCorrelationNode = selectedCorrelationNode
    ?? nodes.find((node) => (
      getCorrelationNodeKey(node.id, analysisDirection)
        === hoveredCorrelationNodeKey
      && hasCorrelationPairs(node, analysisDirection)
    ))
    ?? null;
  const displayNodes = useMemo(() => (
    nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        analysisDirection,
      },
    }))
  ), [analysisDirection, nodes]);
  const edgeOptions = useMemo(() => {
    const isBackward = analysisDirection === 'backward';
    const color = isBackward ? '#c084fc' : '#38bdf8';
    const marker = {
      type: MarkerType.ArrowClosed,
      color,
    };

    return {
      ...baseEdgeOptions,
      markerStart: isBackward ? marker : undefined,
      markerEnd: isBackward ? undefined : marker,
      style: {
        stroke: isBackward ? '#9333ea' : '#2786af',
        strokeWidth: 4,
      },
    };
  }, [analysisDirection]);
  const correlationLines = useMemo(() => (
    createCorrelationLines(
      visibleCorrelationNode,
      nodes,
      viewport,
      showVarianceAnalysis,
      showRankAnalysis,
      analysisDirection,
    )
  ), [
    analysisDirection,
    nodes,
    showRankAnalysis,
    showVarianceAnalysis,
    viewport,
    visibleCorrelationNode,
  ]);

  const pushHistory = useCallback(() => {
    historyRef.current = [
      ...historyRef.current,
      createGraphSnapshot(nodes, edges),
    ];
  }, [edges, nodes]);

  const arrangeNodes = useCallback(() => {
    cancelNodeAnimationRef.current();
    pushHistory();
    const nextNodes = arrangeModuleNodes(nodes);
    const duration = getArrangeAnimationDuration();
    const cancelNodeAnimation = animateNodePositions(
      nodes,
      nextNodes,
      setNodes,
      duration,
    );

    void fitBounds(getTargetNodeBounds(nextNodes), {
      duration,
      ease: easeArrangeAnimation,
      interpolate: 'linear',
      padding: 0.12,
    });
    cancelNodeAnimationRef.current = () => {
      cancelNodeAnimation();
      void setViewport(getViewport());
    };
    syncSelectedNode(nextNodes, selectedNodeIdRef, setSelectedNode);
  }, [
    fitBounds,
    getViewport,
    nodes,
    pushHistory,
    setNodes,
    setSelectedNode,
    setViewport,
  ]);

  const undo = useCallback(() => {
    cancelNodeAnimationRef.current();
    const previousGraph = historyRef.current.at(-1);
    if (!previousGraph) return;

    historyRef.current = historyRef.current.slice(0, -1);
    const previousNodes = updateState(previousGraph.nodes);
    const selectedNode = previousNodes.find((node) => node.selected);

    selectedNodeIdRef.current = selectedNode?.id ?? null;
    setNodes(previousNodes);
    setEdges(previousGraph.edges);
    setSelectedNode(selectedNode?.data ?? null);
  }, [setEdges, setNodes, setSelectedNode]);

  const copySelectedNodes = useCallback(() => {
    const clipboard = createNodeClipboard(nodes, edges);
    if (!clipboard) return;

    clipboardRef.current = clipboard;
    pasteIndexRef.current = 0;
  }, [edges, nodes]);

  const pasteCopiedNodes = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (!clipboard) return;

    pushHistory();
    pasteIndexRef.current += 1;
    const pasted = pasteNodeClipboard(
      clipboard,
      nodes,
      edges,
      pasteIndexRef.current,
    );
    const nextNodes = updateState(rebuildNodeLinks(
      pasted.nodes,
      pasted.edges,
    ));
    const selectedNodeId = pasted.pastedNodeIds[0] ?? null;
    const selectedNode = nextNodes.find((node) => node.id === selectedNodeId);

    selectedNodeIdRef.current = selectedNodeId;
    setEdges(pasted.edges);
    setNodes(nextNodes);
    setSelectedNode(selectedNode?.data ?? null);
  }, [
    edges,
    nodes,
    pushHistory,
    setEdges,
    setNodes,
    setSelectedNode,
  ]);

  const createModuleBaseNode = useCallback((kind: ModuleBaseNodeKind, position: { x: number; y: number }) => {
    pushHistory();
    const id = `${kind}_${Date.now()}`;
    const data = createModuleNodeData(kind, {
      id,
      name: kind,
      type: PageType.NeuralBlueprint,
      position,
    });
    const node: ModuleBaseNode = {
      id,
      type: PageType.NeuralBlueprint,
      position: {
        x: position.x - 70,
        y: position.y - 28,
      },
      data,
      draggable: true,
      selectable: true,
    };

    const nextNodes = updateState([
      ...nodes.map((currentNode) => ({ ...currentNode, selected: false })),
      {
        ...node,
        selected: true,
      },
    ]);
    const nextSelectedNode = nextNodes.find((currentNode) => currentNode.id === id)?.data ?? data;

    selectedNodeIdRef.current = id;
    setSelectedNode(nextSelectedNode);
    setNodes(nextNodes);
  }, [nodes, pushHistory, setNodes, setSelectedNode]);

  const handleNodesChange = useCallback((changes: NodeChange<ModuleBaseNode>[]) => {
    const removedNodeIds = changes
      .filter((change) => change.type === 'remove')
      .map((change) => change.id);

    if (removedNodeIds.length > 0) {
      pushHistory();
      selectedNodeIdRef.current = null;
      setSelectedNode(null);
    }

    if (removedNodeIds.length === 0) {
      onNodesChange(changes);
      return;
    }

    const removedNodeIdSet = new Set(removedNodeIds);
    const nextEdges = edges.filter((edge) => (
      !removedNodeIdSet.has(edge.source) && !removedNodeIdSet.has(edge.target)
    ));
    const nextNodes = updateState(rebuildNodeLinks(
      applyNodeChanges(changes, nodes),
      nextEdges,
    ));

    setEdges(nextEdges);
    setNodes(nextNodes);
    syncSelectedNode(nextNodes, selectedNodeIdRef, setSelectedNode);
  }, [edges, nodes, onNodesChange, pushHistory, setEdges, setNodes, setSelectedNode]);

  const handleEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    const removedEdgeIds = changes
      .filter((change) => change.type === 'remove')
      .map((change) => change.id);

    if (removedEdgeIds.length > 0) {
      pushHistory();
    }

    const nextEdges = applyEdgeChanges(changes, edges);
    setEdges(nextEdges);

    if (removedEdgeIds.length > 0) {
      const nextNodes = updateState(rebuildNodeLinks(nodes, nextEdges));
      setNodes(nextNodes);
      syncSelectedNode(nextNodes, selectedNodeIdRef, setSelectedNode);
    }
  }, [edges, nodes, pushHistory, setEdges, setNodes, setSelectedNode]);

  const selectNode = useCallback((node: ModuleBaseNode) => {
    selectedNodeIdRef.current = node.id;
    setSelectedNode(node.data);
  }, [setSelectedNode]);

  const connectNodes = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);
    if (!sourceNode || !targetNode) return;
    if (sourceNode.data.kind === 'Output' || targetNode.data.kind === 'Input') return;
    if (targetNode.data.kind !== 'Sum' && edges.some((edge) => edge.target === targetNode.id)) return;
    if (edges.some((edge) => edge.source === sourceNode.id && edge.target === targetNode.id)) return;

    pushHistory();
    const nextEdges = addEdge({
      id: `${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    }, edges);
    const nextNodes = updateState(rebuildNodeLinks(nodes, nextEdges));

    setEdges(nextEdges);
    setNodes(nextNodes);
    syncSelectedNode(nextNodes, selectedNodeIdRef, setSelectedNode);
  }, [edges, nodes, pushHistory, setEdges, setNodes, setSelectedNode]);

  const startNodeDrag = useCallback((node: ModuleBaseNode) => {
    cancelNodeAnimationRef.current();
    pushHistory();
    selectNode(node);
  }, [pushHistory, selectNode]);

  const startNodeHover = useCallback((node: ModuleBaseNode) => {
    if (!hasCorrelationPairs(node, analysisDirection)) return;

    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredCorrelationNodeKey(
        getCorrelationNodeKey(node.id, analysisDirection),
      );
      hoverTimerRef.current = null;
    }, 1000);
  }, [analysisDirection]);

  const endNodeHover = useCallback((node: ModuleBaseNode) => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (
      hoveredCorrelationNodeKey
        === getCorrelationNodeKey(node.id, analysisDirection)
    ) {
      setHoveredCorrelationNodeKey(null);
    }
  }, [analysisDirection, hoveredCorrelationNodeKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveNeuralBlueprintGraph(fileId, nodes, edges, {
        analysisDirection,
        showRankAnalysis,
        showVarianceAnalysis,
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    analysisDirection,
    edges,
    fileId,
    nodes,
    showRankAnalysis,
    showVarianceAnalysis,
  ]);

  useEffect(() => {
    if (
      arrangeRequest === 0
      || handledArrangeRequestRef.current === arrangeRequest
    ) return;

    handledArrangeRequestRef.current = arrangeRequest;
    arrangeNodes();
  }, [arrangeNodes, arrangeRequest]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === 'c') {
        event.preventDefault();
        copySelectedNodes();
      } else if (key === 'v') {
        event.preventDefault();
        pasteCopiedNodes();
      } else if (key === 'z') {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelectedNodes, pasteCopiedNodes, undo]);

  useEffect(() => () => {
    cancelNodeAnimationRef.current();
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const kind = event.dataTransfer.getData(MODULE_BASE_NODE_DRAG_TYPE);
    if (!isModuleBaseNodeKind(kind)) return;

    createModuleBaseNode(
      kind,
      screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    );
  }, [createModuleBaseNode, screenToFlowPosition]);

  return (
    <div
      className="canvas-wrap"
      data-file-id={fileId}
      data-analysis-direction={analysisDirection}
      data-rank-analysis={showRankAnalysis}
      data-variance-analysis={showVarianceAnalysis}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow<ModuleBaseNode>
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeOptions}
        connectionLineStyle={{
          stroke: analysisDirection === 'backward' ? '#c084fc' : '#38bdf8',
          strokeWidth: 2,
        }}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={connectNodes}
        onNodeClick={(_, node) => selectNode(node)}
        onNodeDragStart={(_, node) => startNodeDrag(node)}
        onNodeMouseEnter={(_, node) => startNodeHover(node)}
        onNodeMouseLeave={(_, node) => endNodeHover(node)}
        onPaneClick={() => {
          selectedNodeIdRef.current = null;
          setSelectedNode(null);
        }}
        nodesDraggable
        nodesConnectable
        deleteKeyCode="Delete"
        elementsSelectable
        aria-multiselectable
        selectionOnDrag
        fitView={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
      <CorrelationOverlay lines={correlationLines} />
    </div>
  );
}

function hasCorrelationPairs(
  node: ModuleBaseNode,
  analysisDirection: ModuleAnalysisDirection,
) {
  return analysisDirection === 'backward'
    ? Boolean(node.data.backwardOutputPairStats?.length)
    : node.data.kind === 'Sum' && Boolean(node.data.sumInputPairStats?.length);
}

function getCorrelationNodeKey(
  nodeId: string,
  analysisDirection: ModuleAnalysisDirection,
) {
  return `${analysisDirection}:${nodeId}`;
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
  );
}
