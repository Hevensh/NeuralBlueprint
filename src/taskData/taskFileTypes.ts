import type {
  DatasetCapacityProfile,
  DatasetEvaluationProfile,
  KnowledgeDatasetCollection,
} from '../blueprint/knowledgeGraph/model/datasetSplit';
import type {
  KnowledgeEdgeKind,
  KnowledgeAdaptationRequirements,
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
  FeatureNormalizationMode,
  PatchEmbeddingModuleConfig,
  ResNetStageModuleConfig,
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
  pretraining?: TaskPretrainingConfig;
}

export interface TaskFileConfig {
  seed: string;
  neuralBlueprint?: TaskNeuralBlueprintConfig;
  knowledgeGraph?: TaskKnowledgeGraphConfig;
  pretraining?: TaskPretrainingConfig;
}

export interface TaskPretrainingConfig {
  source: string;
}

export interface TaskNeuralBlueprintConfig {
  nodes: TaskModuleNodeConfig[];
  edges?: TaskModuleEdgeConfig[];
  layout?: TaskLayoutConfig;
}

interface TaskModuleNodeBase<TKind extends ModuleBaseNodeKind> {
  id: string;
  name?: string;
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
  time?: ModuleDimension;
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

interface TaskResNetStageNodeConfig
  extends TaskModuleNodeBase<'ResNetStage'>,
  Partial<ResNetStageModuleConfig> {}

interface TaskPatchEmbeddingNodeConfig
  extends TaskModuleNodeBase<'PatchEmbedding'>,
  Partial<PatchEmbeddingModuleConfig> {}

interface TaskPoolingNodeConfig extends TaskModuleNodeBase<'Pooling'> {
  kernelSize?: number;
  stride?: number;
  padding?: number;
  poolMode?: PoolMode;
}

interface TaskNormalizationNodeConfig
  extends TaskModuleNodeBase<'Normalization'> {
  normalizationMode?: FeatureNormalizationMode;
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
  | TaskResNetStageNodeConfig
  | TaskPatchEmbeddingNodeConfig
  | TaskPoolingNodeConfig
  | TaskNormalizationNodeConfig
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
  label?: string;
  position?: TaskGridPosition;
  adaptationRequirements?: KnowledgeAdaptationRequirements;
  requiredMemory?: number;
  overfitCoefficient?: number;
  lossMin?: number;
  lossMax?: number;
}

export interface TaskKnowledgeEdgeConfig {
  kind: KnowledgeEdgeKind;
  source: string;
  target: string;
  id?: string;
  requiredMemory?: number;
  overfitCoefficient?: number;
  lambda?: number;
  adaptationRequirements?: KnowledgeAdaptationRequirements;
}

export interface TaskKnowledgeDatasetConfig {
  id?: string;
  label?: string;
  sampleCount?: number;
  nodeDataAmounts?: Record<string, number>;
  evaluation?: DatasetEvaluationProfile;
  capacity?: DatasetCapacityProfile;
}

export interface TaskLayoutConfig {
  origin?: TaskGridPosition;
  gap?: TaskGridPosition;
}

export interface TaskGridPosition {
  x: number;
  y: number;
}
