import type { Edge, Node } from '@xyflow/react';
import type { KnowledgeGraphPageType } from '../PageTypes';
import type { KnowledgeEdgeKind } from './model/types';
import type { TrainingSignal } from './model/trainingSignal';

export interface KnowledgeGraphNodeProperties {
  dataAmount: number;
  requiredMemory: number;
}

export interface KnowledgeStagePreview {
  utility: number;
  allocated: number;
  required: number;
}

export interface KnowledgeGraphNodeMetrics {
  trainDataAmount: number;
  valDataAmount: number;
  testDataAmount: number;
  effectiveRequiredMemory: number;
  allocatedMemory: number;
  mastery: number;
  overfitPercent: number;
  trainLoss: number;
  valLoss: number;
  training: TrainingSignal;
  stagePreviews: KnowledgeStagePreview[];
}

export interface KnowledgeGraphNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  color: string;
  type: KnowledgeGraphPageType;
  neighborCount: number;
  memorySelectionLabel: string;
  showMemoryPreview: boolean;
  showMetricPreview: boolean;
  showUtilityPreview: boolean;
  showGlobalDebugPreview: boolean;
  datasetHighlighted?: boolean;
  datasetHighlightColor?: string;
  properties: KnowledgeGraphNodeProperties;
  metrics: KnowledgeGraphNodeMetrics;
  position: {
    x: number;
    y: number;
  };
}

export type KnowledgeGraphNodeType = Node<KnowledgeGraphNodeData>;

export interface KnowledgeGraphEdgeProperties {
  requiredMemory: number;
  lambda: number;
}

export interface KnowledgeGraphEdgeMetrics {
  allocatedMemory: number;
  mastery: number;
  effectiveMastery: number;
  overfitPercent: number;
  training: TrainingSignal;
  stagePreviews: KnowledgeStagePreview[];
}

export interface KnowledgeGraphEdgeData extends Record<string, unknown> {
  id: string;
  kind: KnowledgeEdgeKind;
  memorySelectionLabel: string;
  source: KnowledgeGraphNodeData;
  target: KnowledgeGraphNodeData;
  showMemoryPreview: boolean;
  showMetricPreview: boolean;
  showUtilityPreview: boolean;
  showGlobalDebugPreview: boolean;
  hovered?: boolean;
  properties: KnowledgeGraphEdgeProperties;
  metrics: KnowledgeGraphEdgeMetrics;
}

export type KnowledgeGraphEdgeType = Edge<KnowledgeGraphEdgeData>;

export interface KnowledgeGraphEdges {
  depEdges: KnowledgeGraphEdgeType[];
  subEdges: KnowledgeGraphEdgeType[];
  interEdges: KnowledgeGraphEdgeType[];
  all: KnowledgeGraphEdgeType[];
}
