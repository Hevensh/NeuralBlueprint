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
  type ReactFlowInstance,
} from '@xyflow/react';
import { type Dispatch, type DragEvent, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadNeuralBlueprintGraph,
  saveNeuralBlueprintGraph,
} from '../../dataStorage/neuralBlueprintStorage';
import { PageType } from '../PageTypes';
import { updateState } from './analysis';
import {
  MODULE_BASE_NODE_DRAG_TYPE,
} from './NeuralBlueprintLeftPanel';
import { NeuralBlueprintNode } from './NeuralBlueprintNode';
import type {
  ModuleBaseNode,
  ModuleBaseNodeData,
  ModuleBaseNodeKind,
} from './ModuleBaseNodeTypes';
import {
  getDefaultStats,
  isModuleBaseNodeKind,
} from './ModuleBaseNodeTypes';
import { arrangeModuleNodes } from './utils/arrangeNodes';
import { createCorrelationLines } from './utils/correlationLines';
import { CorrelationOverlay } from './utils/correlationOverlay';
import {
  createGraphSnapshot,
  type NeuralBlueprintGraphSnapshot,
} from './utils/graphSnapshot';
import {
  addEdgeLink,
  removeEdgeLinks,
  removeNodeLinks,
} from './utils/nodeLinks';
import { syncSelectedNode } from './utils/selection';

const defaultEdgeOptions = {
  type: 'smoothstep',
  pathOptions: {
    borderRadius: 24,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#38bdf8',
  },
  style: {
    stroke: '#2786af',
    strokeWidth: 4,
  },
};

const nodeTypes = {
  [PageType.NeuralBlueprint]: NeuralBlueprintNode,
};

interface NeuralBlueprintCanvasInnerProp {
  arrangeRequest: number;
  fileId: string;
  showRankAnalysis: boolean;
  showVarianceAnalysis: boolean;
  setSelectedNode: Dispatch<SetStateAction<ModuleBaseNodeData | null>>;
}

export function NeuralBlueprintCanvasInner({
  arrangeRequest,
  fileId,
  showRankAnalysis,
  showVarianceAnalysis,
  setSelectedNode,
}: NeuralBlueprintCanvasInnerProp) {
  const { screenToFlowPosition } = useReactFlow<ModuleBaseNode, Edge>();
  const viewport = useViewport();
  const [, setReactFlowInstance] =
    useState<ReactFlowInstance<ModuleBaseNode, Edge> | null>(null);
  const [initialGraph] = useState(() => {
    const graph = loadNeuralBlueprintGraph(fileId);
    return {
      ...graph,
      nodes: updateState(graph.nodes),
    };
  });
  const [nodes, setNodes, onNodesChange] = useNodesState<ModuleBaseNode>(initialGraph.nodes);
  const [edges, setEdges] = useEdgesState<Edge>(initialGraph.edges);
  const [hoveredSumNodeId, setHoveredSumNodeId] = useState<string | null>(null);
  const historyRef = useRef<NeuralBlueprintGraphSnapshot[]>([]);
  const hoverTimerRef = useRef<number | null>(null);
  const handledArrangeRequestRef = useRef(0);
  const selectedNodeIdRef = useRef<string | null>(null);
  const selectedSumNode = useMemo(() => (
    nodes.find((node) => node.selected && node.data.kind === 'Sum') ?? null
  ), [nodes]);
  const visibleCorrelationNode = selectedSumNode
    ?? nodes.find((node) => node.id === hoveredSumNodeId && node.data.kind === 'Sum')
    ?? null;
  const correlationLines = useMemo(() => (
    createCorrelationLines(
      visibleCorrelationNode,
      nodes,
      viewport,
      showVarianceAnalysis,
      showRankAnalysis,
    )
  ), [nodes, showRankAnalysis, showVarianceAnalysis, viewport, visibleCorrelationNode]);

  const pushHistory = useCallback(() => {
    historyRef.current = [
      ...historyRef.current,
      createGraphSnapshot(nodes, edges),
    ];
  }, [edges, nodes]);

  const arrangeNodes = useCallback(() => {
    pushHistory();
    const nextNodes = arrangeModuleNodes(updateState(nodes));

    setNodes(nextNodes);
    syncSelectedNode(nextNodes, selectedNodeIdRef, setSelectedNode);
  }, [nodes, pushHistory, setNodes, setSelectedNode]);

  const undo = useCallback(() => {
    const previousGraph = historyRef.current.at(-1);
    if (!previousGraph) return;

    historyRef.current = historyRef.current.slice(0, -1);
    setNodes(previousGraph.nodes);
    setEdges(previousGraph.edges);
    setSelectedNode(previousGraph.nodes.find((node) => node.selected)?.data ?? null);
  }, [setEdges, setNodes, setSelectedNode]);

  const createModuleBaseNode = useCallback((kind: ModuleBaseNodeKind, position: { x: number; y: number }) => {
    pushHistory();
    const id = `${kind}_${Date.now()}`;
    const data: ModuleBaseNodeData = {
      id,
      name: kind,
      type: PageType.NeuralBlueprint,
      kind,
      predecessors: [],
      successors: [],
      forwardTopologyOrder: 0,
      backwardTopologyOrder: 0,
      inCycle: false,
      normalizationMode: kind === 'Input' ? '0-1' : undefined,
      initializationMode: kind === 'Linear' ? 'xavier_normal' : undefined,
      biasInitializationMode: kind === 'Linear' ? 'zeros' : undefined,
      dropoutRate: kind === 'Dropout' ? 0.5 : undefined,
      stats: getDefaultStats(kind),
      position,
    };
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
    const nextNodes = updateState(removeNodeLinks(
      applyNodeChanges(changes, nodes),
      removedNodeIdSet,
    ));

    setEdges(nextEdges);
    setNodes(nextNodes);
    syncSelectedNode(nextNodes, selectedNodeIdRef, setSelectedNode);
  }, [edges, nodes, onNodesChange, pushHistory, setEdges, setNodes, setSelectedNode]);

  const handleEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    const removedEdgeIds = changes
      .filter((change) => change.type === 'remove')
      .map((change) => change.id);
    const removedEdges = edges.filter((edge) => removedEdgeIds.includes(edge.id));

    if (removedEdges.length > 0) {
      pushHistory();
    }

    const nextEdges = applyEdgeChanges(changes, edges);
    setEdges(nextEdges);

    if (removedEdges.length > 0) {
      const nextNodes = updateState(removeEdgeLinks(nodes, removedEdges));
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
      ...connection,
      id: `${connection.source}-${connection.target}`,
    }, edges);
    const nextNodes = updateState(addEdgeLink(nodes, sourceNode.data, targetNode.data));

    setEdges(nextEdges);
    setNodes(nextNodes);
    syncSelectedNode(nextNodes, selectedNodeIdRef, setSelectedNode);
  }, [edges, nodes, pushHistory, setEdges, setNodes, setSelectedNode]);

  const startNodeDrag = useCallback((node: ModuleBaseNode) => {
    pushHistory();
    selectNode(node);
  }, [pushHistory, selectNode]);

  const startNodeHover = useCallback((node: ModuleBaseNode) => {
    if (node.data.kind !== 'Sum' || node.data.sumInputPairStats?.length === 0) return;

    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredSumNodeId(node.id);
      hoverTimerRef.current = null;
    }, 1000);
  }, []);

  const endNodeHover = useCallback((node: ModuleBaseNode) => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (hoveredSumNodeId === node.id) {
      setHoveredSumNodeId(null);
    }
  }, [hoveredSumNodeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveNeuralBlueprintGraph(fileId, nodes, edges, {
        showRankAnalysis,
        showVarianceAnalysis,
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [edges, fileId, nodes, showRankAnalysis, showVarianceAnalysis]);

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
      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

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
      data-rank-analysis={showRankAnalysis}
      data-variance-analysis={showVarianceAnalysis}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow<ModuleBaseNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={{ stroke: '#38bdf8', strokeWidth: 2 }}
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
        onInit={setReactFlowInstance}
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
