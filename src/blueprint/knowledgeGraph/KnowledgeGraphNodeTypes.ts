import type { Edge, Node } from '@xyflow/react';
import type { KnowledgeGraphPageType } from '../PageTypes';
import type {
  KnowledgeAdaptationRequirements,
  KnowledgeEdgeKind,
} from './model/types';
import type { TrainingSignal } from './model/trainingSignal';

export interface KnowledgeGraphNodeProperties {
  dataAmount: number;
  requiredMemory: number;
  adaptationRequirements: KnowledgeAdaptationRequirements;
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

export interface KnowledgeAnalysisPreviewState {
  showMemoryPreview: boolean;
  showMetricPreview: boolean;
  showUtilityPreview: boolean;
  showScalePreview: boolean;
  showIndexPreview: boolean;
  showGlobalDebugPreview: boolean;
}

export interface KnowledgeGraphNodeData
  extends Record<string, unknown>, KnowledgeAnalysisPreviewState {
  id: string;
  name: string;
  color: string;
  type: KnowledgeGraphPageType;
  neighborCount: number;
  memorySelectionLabel: string;
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
  adaptationRequirements: KnowledgeAdaptationRequirements;
  lambda: number;
  minimumInferenceStages?: number;
}

export interface KnowledgeGraphEdgeMetrics {
  allocatedMemory: number;
  mastery: number;
  effectiveMastery: number;
  overfitPercent: number;
  training: TrainingSignal;
  stagePreviews: KnowledgeStagePreview[];
}

export interface KnowledgeGraphEdgeData
  extends Record<string, unknown>, KnowledgeAnalysisPreviewState {
  id: string;
  kind: KnowledgeEdgeKind;
  memorySelectionLabel: string;
  source: KnowledgeGraphNodeData;
  target: KnowledgeGraphNodeData;
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
