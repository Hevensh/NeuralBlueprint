import type { Edge, Node } from '@xyflow/react';
import type { KnowledgeGraphPageType } from '../PageTypes';
import type { KnowledgeEdgeKind } from './model/types';

export interface KnowledgeGraphNodeStats {
  dataAmount: number;
  trainDataAmount: number;
  valDataAmount: number;
  testDataAmount: number;
  requiredMemory: number;
  effectiveRequiredMemory: number;
  allocatedMemory: number;
  mastery: number;
  overfitPercent: number;
  trainLoss: number;
  valLoss: number;
}

export interface KnowledgeGraphNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  color: string;
  type: KnowledgeGraphPageType;
  neighborCount: number;
  showMemoryPreview: boolean;
  showMetricPreview: boolean;
  datasetHighlighted?: boolean;
  datasetHighlightColor?: string;
  stats: KnowledgeGraphNodeStats;
  position: {
    x: number;
    y: number;
  };
}

export type KnowledgeGraphNodeType = Node<KnowledgeGraphNodeData>;

export interface KnowledgeGraphEdgeStats {
  requiredMemory: number;
  allocatedMemory: number;
  mastery: number;
  effectiveMastery: number;
  overfitPercent: number;
}

export interface KnowledgeGraphEdgeData extends Record<string, unknown> {
  kind: KnowledgeEdgeKind;
  source: KnowledgeGraphNodeData;
  target: KnowledgeGraphNodeData;
  showMemoryPreview: boolean;
  showMetricPreview: boolean;
  hovered?: boolean;
  stats: KnowledgeGraphEdgeStats;
}

export type KnowledgeGraphEdgeType = Edge<KnowledgeGraphEdgeData>;

export interface KnowledgeGraphEdges {
  depEdges: KnowledgeGraphEdgeType[];
  subEdges: KnowledgeGraphEdgeType[];
  interEdges: KnowledgeGraphEdgeType[];
  all: KnowledgeGraphEdgeType[];
}
