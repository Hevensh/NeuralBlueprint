import type { Node } from '@xyflow/react';
import type { NeuralBlueprintPageType } from '../PageTypes';

export type ModuleBaseNodeKind = 'Input' | 'Linear' | 'ReLU' | 'Dropout' | 'Sum' | 'Output';
export type ModuleAnalysisDirection = 'forward' | 'backward';
export type ModuleDimLabel = 'normal' | 'not the same' | '---';
export type InputNormalizationMode = '0-1' | 'standard';
export type LinearInitializationMode = 'standard_normal' | 'xavier_normal';
export type BiasInitializationMode = 'zeros' | 'standard_normal';

export interface ModuleStats {
  /** Output dimension / potential rank of the module output. */
  rank: number;
  /** Forward inference state for this module output. */
  dimLabel: ModuleDimLabel;
  /** Estimated effective rank carried by the module output. */
  effectiveRank: number;
  /** effectiveRank / rank. This can exceed 1 after Sum composition. */
  saturation: number;
  /** Rank trace used only for linear-correlation rho estimation. */
  minRank?: number;

  /** Mean of the module output activation. */
  mean: number;
  /** Variance of the module output activation. */
  variance: number;
  /** Probability mass exactly at zero. */
  zeroRate: number;
  /** Probability mass below zero before possible ReLU-style clipping. */
  negativeRate?: number;

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

export interface ModuleStatsForwardContext<
  TNode extends ModuleNodeData = ModuleNodeData,
> {
  node: TNode;
  inputs: ModuleStats[];
  inputNodes: ModuleNodeData[];
  nodeMap: Map<string, ModuleNodeData>;
  statsByNodeId: Map<string, ModuleStats>;
}

export interface ModuleStatsForwardResult {
  stats: ModuleStats;
  sumInputPairStats?: SumInputPairStats[];
}

export type ModuleStatsForwardFunction = (
  context: ModuleStatsForwardContext
) => ModuleStatsForwardResult;

export interface ModuleStatsBackward {
  /** Dimension of the gradient propagated toward the module input. */
  rank: number;
  /** Estimated effective rank carried by the gradient. */
  effectiveRank: number;
  /** effectiveRank / rank. This can exceed 1 after branch aggregation. */
  saturation: number;
  /** Rank trace used while propagating through dimension-changing modules. */
  minRank?: number;
  /** Mean of the gradient distribution. */
  mean: number;
  /** Variance of the gradient distribution. */
  variance: number;
  /** Probability mass exactly at zero. */
  zeroRate: number;
  /** Probability mass below zero. */
  negativeRate?: number;
}

export interface ModuleStatsBackwardContext<
  TNode extends ModuleNodeData = ModuleNodeData,
> {
  node: TNode;
  gradient: ModuleStatsBackward;
  outputNodes: ModuleNodeData[];
}

export interface ModuleStatsBackwardResult {
  stats: ModuleStatsBackward;
}

export type ModuleStatsBackwardFunction = (
  context: ModuleStatsBackwardContext
) => ModuleStatsBackwardResult;

export interface ModuleBaseNodeData<
  TKind extends ModuleBaseNodeKind = ModuleBaseNodeKind,
> extends Record<string, unknown> {
  id: string;
  name: string;
  type: NeuralBlueprintPageType;
  kind: TKind;
  predecessors: ModuleNodeData[];
  successors: ModuleNodeData[];
  forwardStats?: ModuleStatsForwardFunction;
  backwardStats?: ModuleStatsBackwardFunction;
  forwardTopologyOrder?: number;
  inferenceTopologyOrder?: Set<number>;
  backwardTopologyOrder?: number;
  inCycle?: boolean;
  stats?: ModuleStats;
  statsBackward?: ModuleStatsBackward;
  analysisDirection?: ModuleAnalysisDirection;
  memoryPoint?: number;
  inferencePoint?: number;
  sumInputPairStats?: SumInputPairStats[];
  backwardOutputPairStats?: BackwardOutputPairStats[];
  position: {
    x: number;
    y: number;
  };
}

export interface InputNodeData extends ModuleBaseNodeData<'Input'> {
  normalizationMode: InputNormalizationMode;
  outFeatures: number;
  inputEffectiveRank: number;
}

export interface LinearNodeData extends ModuleBaseNodeData<'Linear'> {
  initializationMode: LinearInitializationMode;
  biasInitializationMode: BiasInitializationMode;
  inFeatures?: number;
  outFeatures: number;
  useBias: boolean;
}

export interface ReLUNodeData extends ModuleBaseNodeData<'ReLU'> {
  readonly kind: 'ReLU';
}

export interface DropoutNodeData extends ModuleBaseNodeData<'Dropout'> {
  dropoutRate: number;
}

export interface SumNodeData extends ModuleBaseNodeData<'Sum'> {
  readonly kind: 'Sum';
}

export interface OutputNodeData extends ModuleBaseNodeData<'Output'> {
  readonly kind: 'Output';
}

export type ModuleNodeData =
  | InputNodeData
  | LinearNodeData
  | ReLUNodeData
  | DropoutNodeData
  | SumNodeData
  | OutputNodeData;

export type ModuleBaseNode = Node<ModuleNodeData>;
