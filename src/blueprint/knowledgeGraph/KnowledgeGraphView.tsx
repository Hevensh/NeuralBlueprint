import {
  Background,
  Controls,
  ReactFlow,
  type Viewport,
} from '@xyflow/react';
import { useMemo, useState, type ReactNode } from 'react';
import { PageType } from '../PageTypes';
import { LossHistoryMiniChart } from '../trainingProcess/LossHistoryMiniChart';
import type { LossHistoryPoint } from '../trainingProcess/LossHistoryMiniChart';
import { KnowledgeGraphEdge } from './KnowledgeGraphEdge';
import { KnowledgeGraphNode } from './KnowledgeGraphNode';
import type { KnowledgeDataset } from './model/datasetSplit';
import type {
  KnowledgeGraphEdgeType,
  KnowledgeGraphNodeType,
} from './KnowledgeGraphNodeTypes';

const nodeTypes = {
  [PageType.KnowledgeGraph]: KnowledgeGraphNode,
};

const edgeTypes = {
  knowledgeGraphEdge: KnowledgeGraphEdge,
};

interface KnowledgeGraphViewProps {
  nodes: KnowledgeGraphNodeType[];
  edges: KnowledgeGraphEdgeType[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  showMemoryPreview: boolean;
  showMetricPreview: boolean;
  previewDataset: KnowledgeDataset | null;
  topOverlay?: ReactNode;
  lossHistory: LossHistoryPoint[];
  viewport?: Viewport;
  onNodeSelect: (node: KnowledgeGraphNodeType | null) => void;
  onEdgeSelect: (edge: KnowledgeGraphEdgeType | null) => void;
  onViewportChange: (viewport: Viewport) => void;
}

export function KnowledgeGraphView({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  showMemoryPreview,
  showMetricPreview,
  previewDataset,
  topOverlay,
  lossHistory,
  viewport,
  onNodeSelect,
  onEdgeSelect,
  onViewportChange,
}: KnowledgeGraphViewProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const visibleNodes = useMemo(
    () => nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: {
        ...node.data,
        showMemoryPreview,
        showMetricPreview,
        datasetHighlighted: Boolean(
          previewDataset
          && (previewDataset.nodeDataAmounts[node.id] ?? 0) > 0
        ),
        datasetHighlightColor: previewDataset?.color,
      },
    })),
    [
      nodes,
      previewDataset,
      selectedNodeId,
      showMemoryPreview,
      showMetricPreview,
    ],
  );
  const visibleEdges = useMemo(
    () => edges.map((edge) => ({
      ...edge,
      selected: edge.id === selectedEdgeId,
      data: edge.data && {
        ...edge.data,
        showMemoryPreview,
        showMetricPreview,
        hovered: edge.id === hoveredEdgeId,
      },
    })),
    [
      edges,
      hoveredEdgeId,
      selectedEdgeId,
      showMemoryPreview,
      showMetricPreview,
    ],
  );

  return (
    <div className="canvas-wrap knowledge-graph-canvas">
      {topOverlay}
      <ReactFlow<KnowledgeGraphNodeType, KnowledgeGraphEdgeType>
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={viewport}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView={!viewport}
        onEdgeClick={(_, edge) => {
          onEdgeSelect(edge);
          onNodeSelect(null);
        }}
        onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onNodeClick={(_, node) => {
          onEdgeSelect(null);
          onNodeSelect(node);
        }}
        onPaneClick={() => {
          onEdgeSelect(null);
          onNodeSelect(null);
        }}
        onMoveEnd={(_, nextViewport) => onViewportChange(nextViewport)}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(103, 232, 249, 0.18)" gap={22} />
        <Controls />
      </ReactFlow>
      <LossHistoryMiniChart history={lossHistory} />
    </div>
  );
}
