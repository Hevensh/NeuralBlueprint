import {
  Background,
  ReactFlow,
  addEdge,
  MarkerType,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from '@xyflow/react';
import { type Dispatch, type DragEvent, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
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

const nodeTypes = {
  [PageType.NeuralBlueprint]: NeuralBlueprintNode,
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#38bdf8',
  },
  style: {
    stroke: '#2786af',
    strokeWidth: 4,
  },
};

interface NeuralBlueprintGraphSnapshot {
  nodes: ModuleBaseNode[];
  edges: Edge[];
}

interface NeuralBlueprintCanvasInnerProp {
  fileId: string;
  showRankAnalysis: boolean;
  showVarianceAnalysis: boolean;
  setSelectedNode: Dispatch<SetStateAction<ModuleBaseNodeData | null>>;
}

export function NeuralBlueprintCanvasInner({
  fileId,
  showRankAnalysis,
  showVarianceAnalysis,
  setSelectedNode,
}: NeuralBlueprintCanvasInnerProp) {
  const { screenToFlowPosition } = useReactFlow<ModuleBaseNode, Edge>();
  const [, setReactFlowInstance] =
    useState<ReactFlowInstance<ModuleBaseNode, Edge> | null>(null);
  const [initialGraph] = useState(() => {
    const graph = loadNeuralBlueprintGraph(fileId);
    updateState(graph.nodes);
    return graph;
  });
  const [nodes, setNodes, onNodesChange] = useNodesState<ModuleBaseNode>(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialGraph.edges);
  const historyRef = useRef<NeuralBlueprintGraphSnapshot[]>([]);

  const pushHistory = useCallback(() => {
    historyRef.current = [
      ...historyRef.current,
      createGraphSnapshot(nodes, edges),
    ];
  }, [edges, nodes]);

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
      normalizationMode: kind === 'Input' ? '0-1' : undefined,
      initializationMode: kind === 'Linear' ? 'normal' : undefined,
      biasInitializationMode: kind === 'Linear' ? 'zeros' : undefined,
      rankStats: {
        rank: getDefaultOutputDim(),
        effectiveRank: getDefaultOutputDim(),
        saturation: 0,
      },
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

    setSelectedNode(data);
    setNodes((currentNodes) => [
      ...currentNodes.map((currentNode) => ({ ...currentNode, selected: false })),
      {
        ...node,
        selected: true,
      },
    ]);
  }, [pushHistory, setNodes, setSelectedNode]);

  const handleNodesChange = useCallback((changes: NodeChange<ModuleBaseNode>[]) => {
    if (changes.some((change) => change.type === 'remove')) {
      pushHistory();
      setSelectedNode(null);
    }
    onNodesChange(changes);
  }, [onNodesChange, pushHistory, setSelectedNode]);

  const handleEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    if (changes.some((change) => change.type === 'remove')) {
      pushHistory();
    }
    onEdgesChange(changes);
  }, [onEdgesChange, pushHistory]);

  const selectNode = useCallback((node: ModuleBaseNode) => {
    setSelectedNode(node.data);
  }, [setSelectedNode]);

  const connectNodes = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    setNodes((currentNodes) => {
      const sourceNode = currentNodes.find((node) => node.id === connection.source);
      const targetNode = currentNodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return currentNodes;
      if (sourceNode.data.kind === 'Output' || targetNode.data.kind === 'Input') return currentNodes;
      if (targetNode.data.kind !== 'Sum' && targetNode.data.predecessors.length > 0) return currentNodes;

      const nextNodes = currentNodes.map((node) => {
        if (node.id === connection.source) {
          return {
            ...node,
            data: {
              ...node.data,
              successors: [...node.data.successors, targetNode.data],
            },
          };
        }
        if (node.id === connection.target) {
          return {
            ...node,
            data: {
              ...node.data,
              predecessors: [...node.data.predecessors, sourceNode.data],
            },
          };
        }
        return node;
      });
      const selectedNode = nextNodes.find((node) => node.selected);
      if (selectedNode) {
        setSelectedNode(selectedNode.data);
      }
      return nextNodes;
    });
    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);
    if (!sourceNode || !targetNode) return;
    if (sourceNode.data.kind === 'Output' || targetNode.data.kind === 'Input') return;
    if (targetNode.data.kind !== 'Sum' && targetNode.data.predecessors.length > 0) return;

    pushHistory();
    setEdges((currentEdges) => addEdge({
      ...connection,
      id: `${connection.source}-${connection.target}`,
    }, currentEdges));
  }, [nodes, pushHistory, setEdges, setNodes, setSelectedNode]);

  const startNodeDrag = useCallback((node: ModuleBaseNode) => {
    pushHistory();
    selectNode(node);
  }, [pushHistory, selectNode]);

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
        onPaneClick={() => setSelectedNode(null)}
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
    </div>
  );
}

function isModuleBaseNodeKind(kind: string): kind is ModuleBaseNodeKind {
  return kind === 'Input' || kind === 'Linear' || kind === 'ReLU' || kind === 'Sum' || kind === 'Output';
}

function getDefaultOutputDim() {
  return 64;
}

function createGraphSnapshot(
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

  const snapshotNodes = nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: dataById.get(node.id) as ModuleBaseNodeData,
  }));

  return {
    nodes: snapshotNodes,
    edges: snapshotEdges,
  };
}
