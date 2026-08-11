import type {
  KnowledgeDatasetCollection,
} from '../blueprint/knowledgeGraph/model/datasetSplit';
import type {
  KnowledgeEdgeKind,
  KnowledgeGraphDefinition,
} from '../blueprint/knowledgeGraph/model/types';
import type {
  InputNormalizationMode,
  LinearInitializationMode,
  BiasInitializationMode,
  ModuleBaseNodeKind,
  ModuleLockedProperty,
  ModuleDimension,
  PoolMode,
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

interface TaskModuleNodeBase<TKind extends ModuleBaseNodeKind> {
  id: string;
  kind: TKind;
  position: TaskGridPosition;
  lockedProperties?: ModuleLockedProperty[];
  deletable?: boolean;
}

interface TaskInputNodeConfig extends TaskModuleNodeBase<'Input'> {
  outFeatures?: number;
  inputEffectiveRank?: number;
  normalizationMode?: InputNormalizationMode;
}

interface TaskThreeDInputNodeConfig
  extends TaskModuleNodeBase<'3DInput'> {
  outFeatures?: number;
  inputEffectiveRank?: number;
  normalizationMode?: InputNormalizationMode;
  height?: ModuleDimension;
  width?: ModuleDimension;
}

interface TaskLinearNodeConfig extends TaskModuleNodeBase<'Linear'> {
  outFeatures?: number;
  initializationMode?: LinearInitializationMode;
  biasInitializationMode?: BiasInitializationMode;
  useBias?: boolean;
}

interface TaskCNNNodeConfig extends TaskModuleNodeBase<'CNN'> {
  outFeatures?: number;
  kernelSize?: number;
  stride?: number;
  padding?: number;
  dilation?: number;
  initializationMode?: LinearInitializationMode;
  biasInitializationMode?: BiasInitializationMode;
  useBias?: boolean;
}

interface TaskPoolingNodeConfig extends TaskModuleNodeBase<'Pooling'> {
  kernelSize?: number;
  stride?: number;
  padding?: number;
  poolMode?: PoolMode;
}

interface TaskGlobalPoolingNodeConfig
  extends TaskModuleNodeBase<'GlobalPooling'> {
  poolMode?: PoolMode;
}

interface TaskDropoutNodeConfig extends TaskModuleNodeBase<'Dropout'> {
  dropoutRate?: number;
}

interface TaskOutputNodeConfig extends TaskModuleNodeBase<'Output'> {
  neededOutputDim?: number;
  time?: ModuleDimension;
  height?: ModuleDimension;
  width?: ModuleDimension;
}

type TaskParameterlessNodeConfig =
  | TaskModuleNodeBase<'Flatten'>
  | TaskModuleNodeBase<'ReLU'>
  | TaskModuleNodeBase<'Sum'>;

export type TaskModuleNodeConfig =
  | TaskInputNodeConfig
  | TaskThreeDInputNodeConfig
  | TaskLinearNodeConfig
  | TaskCNNNodeConfig
  | TaskPoolingNodeConfig
  | TaskGlobalPoolingNodeConfig
  | TaskDropoutNodeConfig
  | TaskOutputNodeConfig
  | TaskParameterlessNodeConfig;

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
