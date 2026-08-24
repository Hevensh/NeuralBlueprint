import type { Node } from '@xyflow/react';
import type { NeuralBlueprintPageType } from '../PageTypes';

export type ModuleBaseNodeKind =
  | 'Input'
  | '3DInput'
  | 'Linear'
  | 'CNN'
  | 'ResNetStage'
  | 'PatchEmbedding'
  | 'Resize'
  | 'Pooling'
  | 'Normalization'
  | 'Flatten'
  | 'GlobalPooling'
  | 'ReLU'
  | 'Dropout'
  | 'Sum'
  | 'Output';
export type ModuleAnalysisDirection = 'forward' | 'backward';
export type ModuleAnalysisStatus =
  | 'valid'
  | 'disconnected'
  | 'cycle'
  | 'shape-mismatch'
  | 'unknown';
export type InputNormalizationMode = '0-1' | 'standard';
export type LinearInitializationMode = 'standard_normal' | 'xavier_normal';
export type BiasInitializationMode = 'zeros' | 'standard_normal';
export type PoolMode = 'max' | 'average';
export type FeatureNormalizationMode = 'batch' | 'layer';
export type ModuleDimension = number | 'unknown' | 'absent';
export interface ModuleTensorShape {
  time: ModuleDimension;
  channels: ModuleDimension;
  height: ModuleDimension;
  width: ModuleDimension;
}
export type SpatialAxis = 'time' | 'height' | 'width';
export interface SpatialAxisViewStats {
  /** Size of the original input axis measured in source coordinates. */
  sourceSize: ModuleDimension;
  /** Number of positions on the current feature grid before token flattening. */
  positions: ModuleDimension;
  /** Distance between adjacent current positions in source coordinates. */
  jump: ModuleDimension;
  /** Source-coordinate span visible from one current position. */
  reach: ModuleDimension;
}
export interface PatchFrame {
  sourceShape: Record<SpatialAxis, ModuleDimension>;
  gridShape: Record<SpatialAxis, ModuleDimension>;
  patchSize: Record<SpatialAxis, number>;
  stride: Record<SpatialAxis, number>;
  flattenOrder: SpatialAxis[];
}
export interface SpatialViewStats {
  axes: Record<SpatialAxis, SpatialAxisViewStats>;
  /** Joint independent local samples available to a learned spatial module. */
  viewRank: number;
  /** Original-coordinate mapping retained after a spatial grid becomes tokens. */
  patchFrame?: PatchFrame;
}
export interface RepetitionRank {
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
  global: number;
}
export interface RepetitionStats {
  /** Unclipped capability propagated through the network. */
  potential: RepetitionRank;
  /** Capability currently usable under the forward effective-rank bottleneck. */
  effective: RepetitionRank;
}
export interface DistanceIndexRank {
  none: number;
  short: number;
  medium: number;
  long: number;
  global: number;
}
export interface ModuleRankStats {
  /** Structural rank of the module output. */
  outputRank: number;
  /** Rank used as the denominator of the current saturation estimate. */
  basisRank: number;
  effectiveRank: number;
  saturation: number;
  minRank?: number;
}
export interface DistributionSupportPoint {
  value: number;
  probability: number;
}
export interface ModuleDistributionStats {
  mean: number;
  variance: number;
  zeroRate: number;
  negativeRate?: number;
  /** Runtime CDF sketch used by nonlinear distribution propagation. */
  support?: DistributionSupportPoint[];
}
export interface ModuleAdaptationStats {
  repetition: RepetitionStats;
  /** Static forward capability. Propagation rules are intentionally pending. */
  distanceIndex: DistanceIndexRank;
}
export type ModuleLockedProperty =
  | 'outFeatures'
  | 'inputEffectiveRank'
  | 'neededOutputDim';

export interface ModuleNodeLock {
  deletion?: boolean;
  properties?: ModuleLockedProperty[];
}

export interface ModuleStats {
  status: ModuleAnalysisStatus;
  rank: ModuleRankStats;
  /** Tensor shape carried alongside channel-rank analysis. */
  shape: ModuleTensorShape;
  spatialView: SpatialViewStats;
  distribution: ModuleDistributionStats;
  adaptation: ModuleAdaptationStats;
  /** Derived fit between the current feature-map size and its stage reference. */
  spatialResolutionFit?: number;

  /**
   * Element-level activation correlation from this output to each direct input
   * output. This belongs to variance analysis and is used for Sum covariance.
   */
  inputElementCorr?: Record<string, number>;

  /**
   * Linear information correlation from this output to each direct input output.
   * This belongs to rank analysis: Linear keeps linear information unless it
   * compresses dimension, while ReLU weakens recoverability by activation loss.
   */
  inputLinearCorr?: Record<string, number>;
}

export interface SumInputPairStats {
  leftNodeId: string;
  rightNodeId: string;
  covarianceCorrelation: number;
  linearCorrelation: number;
  correlation: number;
  covariance: number;
}

export interface BackwardOutputPairStats {
  leftNodeId: string;
  rightNodeId: string;
  covarianceCorrelation: number;
  linearCorrelation: number;
  covariance: number;
}

export interface ModuleStatsForwardContext {
  node: ModuleNodeData;
  inputs: ModuleStats[];
  inputNodes: ModuleNodeData[];
  nodeMap: Map<string, ModuleNodeData>;
  statsByNodeId: Map<string, ModuleStats>;
}

export interface ModuleStatsForwardResult {
  stats: ModuleStats;
  sumInputPairStats?: SumInputPairStats[];
}

export interface ModuleStatsBackward {
  rank: ModuleRankStats;
  distribution: ModuleDistributionStats;
}

export interface ModuleBaseNodeData<
  TKind extends ModuleBaseNodeKind = ModuleBaseNodeKind,
> extends Record<string, unknown> {
  id: string;
  name: string;
  type: NeuralBlueprintPageType;
  kind: TKind;
  links: {
    predecessorIds: string[];
    successorIds: string[];
  };
  /** Derived runtime links; never persisted. */
  predecessors: ModuleNodeData[];
  /** Derived runtime links; never persisted. */
  successors: ModuleNodeData[];
  forwardTopologyOrder?: number;
  inferenceTopologyOrder?: Set<number>;
  backwardTopologyOrder?: number;
  inCycle?: boolean;
  inInferenceMemoryFocus?: boolean;
  stats?: ModuleStats;
  statsBackward?: ModuleStatsBackward;
  analysisDirection?: ModuleAnalysisDirection;
  locked?: ModuleNodeLock;
  memoryPoint?: number;
  inferencePoint?: number;
  sumInputPairStats?: SumInputPairStats[];
  backwardOutputPairStats?: BackwardOutputPairStats[];
}

export interface InputModuleConfig {
  normalizationMode: InputNormalizationMode;
  outFeatures: number;
  inputEffectiveRank: number;
}

export interface ThreeDInputModuleConfig extends InputModuleConfig {
  /** Omitted and `absent` both mean an image input without a time axis. */
  time?: ModuleDimension;
  height: Exclude<ModuleDimension, 'absent'>;
  width: Exclude<ModuleDimension, 'absent'>;
}

export interface LinearModuleConfig {
  initializationMode: LinearInitializationMode;
  biasInitializationMode: BiasInitializationMode;
  inFeatures?: number;
  outFeatures: number;
  useBias: boolean;
}

export interface CNNModuleConfig {
  initializationMode: LinearInitializationMode;
  biasInitializationMode: BiasInitializationMode;
  outFeatures: number;
  kernelSize: number;
  stride: number;
  padding: number;
  dilation: number;
  /** Number of convolution groups; equal to input channels for depthwise CNN. */
  groups: number;
  useBias: boolean;
}

export interface ResNetStageModuleConfig {
  initializationMode: LinearInitializationMode;
  biasInitializationMode: BiasInitializationMode;
  outFeatures: number;
  /** ResNet BasicBlocks inside this visible stage. */
  blockCount: number;
  /** Spatial stride of the first block; later blocks always use stride 1. */
  stride: number;
  useBias: boolean;
  /** 1-based order in a pretrained model; 0 means scratch/unassigned. */
  pretrainingOrder: number;
  /** Transfer memory contributed to each dependency at the matching depth. */
  pretrainedDependencyMemoryPoints: number;
  /** Expected feature-map size for the reference input resolution. */
  referenceHeight?: number;
  referenceWidth?: number;
}

export interface ResNetInternalConvAnalysis {
  id: string;
  blockIndex: number;
  branch: 'main' | 'projection';
  inputChannels: number;
  outputChannels: number;
  kernelSize: number;
  stride: number;
  stats: ModuleStats;
  statsBackward?: ModuleStatsBackward;
  memoryPoint?: number;
}

export interface PatchEmbeddingModuleConfig {
  initializationMode: LinearInitializationMode;
  biasInitializationMode: BiasInitializationMode;
  outFeatures: number;
  patchHeight: number;
  patchWidth: number;
  strideHeight: number;
  strideWidth: number;
  useBias: boolean;
}

export interface ResizeModuleConfig {
  targetHeight: number;
  targetWidth: number;
  interpolation: 'nearest' | 'bilinear';
}

export interface PoolingModuleConfig {
  poolMode: PoolMode;
  kernelSize: number;
  stride: number;
  padding: number;
}

export interface NormalizationModuleConfig {
  normalizationMode: FeatureNormalizationMode;
}

export interface GlobalPoolingModuleConfig {
  poolMode: PoolMode;
}

export interface DropoutModuleConfig {
  dropoutRate: number;
}

export interface OutputModuleConfig {
  neededOutputDim: number;
  neededTime: ModuleDimension;
  neededHeight: ModuleDimension;
  neededWidth: ModuleDimension;
}

export interface ModuleConfigByKind {
  Input: InputModuleConfig;
  '3DInput': ThreeDInputModuleConfig;
  Linear: LinearModuleConfig;
  CNN: CNNModuleConfig;
  ResNetStage: ResNetStageModuleConfig;
  PatchEmbedding: PatchEmbeddingModuleConfig;
  Resize: ResizeModuleConfig;
  Pooling: PoolingModuleConfig;
  Normalization: NormalizationModuleConfig;
  Flatten: Record<string, never>;
  GlobalPooling: GlobalPoolingModuleConfig;
  ReLU: Record<string, never>;
  Dropout: DropoutModuleConfig;
  Sum: Record<string, never>;
  Output: OutputModuleConfig;
}

export interface InputNodeData
  extends ModuleBaseNodeData<'Input'>, InputModuleConfig {}

export interface ThreeDInputNodeData
  extends ModuleBaseNodeData<'3DInput'>, ThreeDInputModuleConfig {
  normalizationMode: InputNormalizationMode;
  outFeatures: number;
  inputEffectiveRank: number;
  time: ModuleDimension;
  height: Exclude<ModuleDimension, 'absent'>;
  width: Exclude<ModuleDimension, 'absent'>;
}

export interface LinearNodeData
  extends ModuleBaseNodeData<'Linear'>, LinearModuleConfig {}

export interface CNNNodeData
  extends ModuleBaseNodeData<'CNN'>, CNNModuleConfig {}

export interface ResNetStageNodeData
  extends ModuleBaseNodeData<'ResNetStage'>, ResNetStageModuleConfig {
  /** Runtime-only expansion used by analysis; never persisted. */
  internalConvs?: ResNetInternalConvAnalysis[];
  /** Runtime-only stages occupied by internal convolutions. */
  internalInferenceTopologyOrder?: Set<number>;
}

export interface PatchEmbeddingNodeData
  extends ModuleBaseNodeData<'PatchEmbedding'>, PatchEmbeddingModuleConfig {}

export interface ResizeNodeData
  extends ModuleBaseNodeData<'Resize'>, ResizeModuleConfig {}

export interface PoolingNodeData
  extends ModuleBaseNodeData<'Pooling'>, PoolingModuleConfig {}

export interface NormalizationNodeData
  extends ModuleBaseNodeData<'Normalization'>, NormalizationModuleConfig {}

export interface FlattenNodeData extends ModuleBaseNodeData<'Flatten'> {
  readonly kind: 'Flatten';
}

export interface GlobalPoolingNodeData
  extends ModuleBaseNodeData<'GlobalPooling'>, GlobalPoolingModuleConfig {}

export interface ReLUNodeData extends ModuleBaseNodeData<'ReLU'> {
  readonly kind: 'ReLU';
}

export interface DropoutNodeData
  extends ModuleBaseNodeData<'Dropout'>, DropoutModuleConfig {}

export interface SumNodeData extends ModuleBaseNodeData<'Sum'> {
  readonly kind: 'Sum';
}

export interface OutputNodeData
  extends ModuleBaseNodeData<'Output'>, OutputModuleConfig {
  readonly kind: 'Output';
}

export type ModuleNodeData =
  | InputNodeData
  | ThreeDInputNodeData
  | LinearNodeData
  | CNNNodeData
  | ResNetStageNodeData
  | PatchEmbeddingNodeData
  | ResizeNodeData
  | PoolingNodeData
  | NormalizationNodeData
  | FlattenNodeData
  | GlobalPoolingNodeData
  | ReLUNodeData
  | DropoutNodeData
  | SumNodeData
  | OutputNodeData;

export type ModuleBaseNode = Node<ModuleNodeData>;
