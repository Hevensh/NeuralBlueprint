import type {
  KnowledgeDatasetCollection,
} from '../blueprint/knowledgeGraph/model/datasetSplit';
import type {
  KnowledgeEdgeKind,
  KnowledgeGraphDefinition,
} from '../blueprint/knowledgeGraph/model/types';
import type {
  InputNormalizationMode,
  ModuleBaseNodeKind,
  ModuleLockedProperty,
} from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';
import type { StoredNeuralBlueprintGraph } from '../dataStorage/neuralBlueprintStorage';

export interface TaskFileInitialState {
  neuralBlueprint?: {
    graph: StoredNeuralBlueprintGraph;
  };
  knowledgeGraph?: {
    graphDefinition: KnowledgeGraphDefinition;
    datasetCollection?: KnowledgeDatasetCollection;
  };
}

export interface TaskFileConfig {
  seed: string;
  neuralBlueprint?: TaskNeuralBlueprintConfig;
  knowledgeGraph?: TaskKnowledgeGraphConfig;
}

export interface TaskNeuralBlueprintConfig {
  nodes: TaskModuleNodeConfig[];
  edges?: TaskModuleEdgeConfig[];
  layout?: TaskLayoutConfig;
}

export type TaskModuleNodeConfig = {
  id: string;
  kind: ModuleBaseNodeKind;
  position: TaskGridPosition;
  outputDim?: number;
  effectiveRank?: number;
  neededOutputDim?: number;
  normalizationMode?: InputNormalizationMode;
  lockedProperties?: ModuleLockedProperty[];
  deletable?: boolean;
};

export interface TaskModuleEdgeConfig {
  source: string;
  target: string;
  id?: string;
}

export interface TaskKnowledgeGraphConfig {
  nodes: TaskKnowledgeNodeConfig[];
  edges?: TaskKnowledgeEdgeConfig[];
  datasets?: TaskKnowledgeDatasetConfig[];
  layout?: TaskLayoutConfig;
}

export interface TaskKnowledgeNodeConfig {
  id: string;
  position?: TaskGridPosition;
}

export interface TaskKnowledgeEdgeConfig {
  kind: KnowledgeEdgeKind;
  source: string;
  target: string;
  id?: string;
}

export interface TaskKnowledgeDatasetConfig {
  id?: string;
  nodeDataAmounts?: Record<string, number>;
}

export interface TaskLayoutConfig {
  origin?: TaskGridPosition;
  gap?: TaskGridPosition;
}

export interface TaskGridPosition {
  x: number;
  y: number;
}
