import type { Node } from '@xyflow/react';
import type { NeuralBlueprintPageType } from '../PageTypes';

export type ModuleBaseNodeKind =
  | 'Input'
  | '3DInput'
  | 'Linear'
  | 'CNN'
  | 'Pooling'
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
export type ModuleDimension = number | 'unknown' | 'absent';
export interface ModuleTensorShape {
  time: ModuleDimension;
  channels: ModuleDimension;
  height: ModuleDimension;
  width: ModuleDimension;
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
  /** Learnable memory capacity after combining with backward effective rank. */
  memory: RepetitionRank;
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
  distribution: ModuleDistributionStats;
  adaptation: ModuleAdaptationStats;

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
  showRepetitionAnalysis?: boolean;
  sumInputPairStats?: SumInputPairStats[];
  backwardOutputPairStats?: BackwardOutputPairStats[];
}

export interface InputModuleConfig {
  normalizationMode: InputNormalizationMode;
  outFeatures: number;
  inputEffectiveRank: number;
}

export interface ThreeDInputModuleConfig extends InputModuleConfig {
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
  useBias: boolean;
}

export interface PoolingModuleConfig {
  poolMode: PoolMode;
  kernelSize: number;
  stride: number;
  padding: number;
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
  Pooling: PoolingModuleConfig;
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
  height: Exclude<ModuleDimension, 'absent'>;
  width: Exclude<ModuleDimension, 'absent'>;
}

export interface LinearNodeData
  extends ModuleBaseNodeData<'Linear'>, LinearModuleConfig {}

export interface CNNNodeData
  extends ModuleBaseNodeData<'CNN'>, CNNModuleConfig {}

export interface PoolingNodeData
  extends ModuleBaseNodeData<'Pooling'>, PoolingModuleConfig {}

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
  | PoolingNodeData
  | FlattenNodeData
  | GlobalPoolingNodeData
  | ReLUNodeData
  | DropoutNodeData
  | SumNodeData
  | OutputNodeData;

export type ModuleBaseNode = Node<ModuleNodeData>;
