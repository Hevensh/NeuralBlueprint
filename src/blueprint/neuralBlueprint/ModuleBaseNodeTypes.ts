import type { Node } from '@xyflow/react';
import type { NeuralBlueprintPageType } from '../PageTypes';

export type ModuleBaseNodeKind = 'Input' | 'Linear' | 'ReLU' | 'Dropout' | 'Sum' | 'Output';
export type ModuleAnalysisDirection = 'forward' | 'backward';
export type InputNormalizationMode = '0-1' | 'standard';
export type LinearInitializationMode = 'standard_normal' | 'xavier_normal';
export type BiasInitializationMode = 'zeros' | 'standard_normal';
export type ModuleBackwardFunction = (gradient: unknown) => unknown;

export interface ModuleStats {
  /** Output dimension / potential rank of the module output. */
  rank: number;
  /** Optional display override for invalid or non-numeric output dimension. */
  dimLabel?: string;
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

export interface ModuleStatsForwardContext {
  node: ModuleBaseNodeData;
  inputs: ModuleStats[];
  inputNodes: ModuleBaseNodeData[];
  nodeMap: Map<string, ModuleBaseNodeData>;
  statsByNodeId: Map<string, ModuleStats>;
}

export interface ModuleStatsForwardResult {
  stats: ModuleStats;
  sumInputPairStats?: SumInputPairStats[];
  message?: string;
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

export interface ModuleStatsBackwardContext {
  node: ModuleBaseNodeData;
  gradient: ModuleStatsBackward;
  outputNodes: ModuleBaseNodeData[];
}

export interface ModuleStatsBackwardResult {
  stats: ModuleStatsBackward;
  message?: string;
}

export type ModuleStatsBackwardFunction = (
  context: ModuleStatsBackwardContext
) => ModuleStatsBackwardResult;

export interface ModuleBaseNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  type: NeuralBlueprintPageType;
  kind: ModuleBaseNodeKind;
  predecessors: ModuleBaseNodeData[];
  successors: ModuleBaseNodeData[];
  forwardStats?: ModuleStatsForwardFunction;
  backwardStats?: ModuleStatsBackwardFunction;
  backward?: ModuleBackwardFunction;
  forwardTopologyOrder?: number;
  backwardTopologyOrder?: number;
  inCycle?: boolean;
  normalizationMode?: InputNormalizationMode;
  initializationMode?: LinearInitializationMode;
  biasInitializationMode?: BiasInitializationMode;
  dropoutRate?: number;
  inFeatures?: number;
  outFeatures?: number;
  useBias?: boolean;
  stats?: ModuleStats;
  statsBackward?: ModuleStatsBackward;
  analysisDirection?: ModuleAnalysisDirection;
  sumInputPairStats?: SumInputPairStats[];
  backwardOutputPairStats?: BackwardOutputPairStats[];
  position: {
    x: number;
    y: number;
  };
}

export type ModuleBaseNode = Node<ModuleBaseNodeData>;

export const DEFAULT_OUTPUT_DIM = 64;
export const DEFAULT_INPUT_EFFECTIVE_RANK = 32;

const moduleBaseNodeKinds: ModuleBaseNodeKind[] = [
  'Input',
  'Linear',
  'ReLU',
  'Dropout',
  'Sum',
  'Output',
];

export function isModuleBaseNodeKind(kind: string): kind is ModuleBaseNodeKind {
  return moduleBaseNodeKinds.includes(kind as ModuleBaseNodeKind);
}

export function getDefaultStats(kind: ModuleBaseNodeKind): ModuleStats {
  if (kind === 'Input') {
    return {
      rank: DEFAULT_OUTPUT_DIM,
      effectiveRank: DEFAULT_INPUT_EFFECTIVE_RANK,
      saturation: DEFAULT_INPUT_EFFECTIVE_RANK / DEFAULT_OUTPUT_DIM,
      minRank: DEFAULT_OUTPUT_DIM,
      mean: 0.5,
      variance: 1 / 12,
      zeroRate: 0,
      negativeRate: 0,
    };
  }

  if (kind === 'Linear') {
    return {
      rank: DEFAULT_OUTPUT_DIM,
      effectiveRank: Number.NaN,
      saturation: Number.NaN,
      minRank: Number.NaN,
      mean: Number.NaN,
      variance: Number.NaN,
      zeroRate: Number.NaN,
      negativeRate: Number.NaN,
    };
  }

  return {
    rank: Number.NaN,
    effectiveRank: Number.NaN,
    saturation: Number.NaN,
    minRank: Number.NaN,
    mean: Number.NaN,
    variance: Number.NaN,
    zeroRate: Number.NaN,
    negativeRate: Number.NaN,
  };
}
