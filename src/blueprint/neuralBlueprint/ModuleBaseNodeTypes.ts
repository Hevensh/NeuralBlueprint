import type { Node } from '@xyflow/react';
import type { NeuralBlueprintPageType } from '../PageTypes';

export type ModuleBaseNodeKind = 'Input' | 'Linear' | 'ReLU' | 'Sum' | 'Output';
export type InputNormalizationMode = '0-1' | 'standard';
export type LinearInitializationMode = 'standard_normal' | 'xavier_normal';
export type BiasInitializationMode = 'zeros' | 'standard_normal';
export type ModuleBackwardFunction = (gradient: unknown) => unknown;

export interface ModuleRankStats {
  /** Output dimension / potential rank of the module output. */
  rank: number;
  /** Estimated effective rank carried by the module output. */
  effectiveRank: number;
  /** effectiveRank / rank. This can exceed 1 after Sum composition. */
  saturation: number;
  /**
   * Linear information correlation from this output to each direct input output.
   * This belongs to rank analysis: Linear keeps linear information unless it
   * compresses dimension, while ReLU weakens recoverability by activation loss.
   */
  inputLinearCorr?: Record<string, number>;
}

export interface ModuleVarianceStats {
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
}

export interface SumInputPairStats {
  leftNodeId: string;
  rightNodeId: string;
  covarianceCorrelation: number;
  linearCorrelation: number;
  correlation: number;
  covariance: number;
}

export interface ModuleForwardContext {
  node: ModuleBaseNodeData;
  inputs: ModuleVarianceStats[];
  inputNodes?: ModuleBaseNodeData[];
  nodeMap?: Map<string, ModuleBaseNodeData>;
  statsByNodeId?: Map<string, ModuleVarianceStats>;
}

export interface ModuleForwardResult {
  stat: ModuleVarianceStats;
  message?: string;
}

export type ModuleForwardFunction = (
  context: ModuleForwardContext
) => ModuleForwardResult;

export interface ModuleBaseNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  type: NeuralBlueprintPageType;
  kind: ModuleBaseNodeKind;
  predecessors: ModuleBaseNodeData[];
  successors: ModuleBaseNodeData[];
  forward?: ModuleForwardFunction;
  backward?: ModuleBackwardFunction;
  forwardTopologyOrder?: number;
  backwardTopologyOrder?: number;
  inCycle?: boolean;
  normalizationMode?: InputNormalizationMode;
  initializationMode?: LinearInitializationMode;
  biasInitializationMode?: BiasInitializationMode;
  inFeatures?: number;
  outFeatures?: number;
  useBias?: boolean;
  rankStats?: ModuleRankStats;
  varianceStats?: ModuleVarianceStats;
  sumInputPairStats?: SumInputPairStats[];
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
  'Sum',
  'Output',
];

export function isModuleBaseNodeKind(kind: string): kind is ModuleBaseNodeKind {
  return moduleBaseNodeKinds.includes(kind as ModuleBaseNodeKind);
}

export function getDefaultRankStats(kind: ModuleBaseNodeKind): ModuleRankStats {
  if (kind === 'Input') {
    return {
      rank: DEFAULT_OUTPUT_DIM,
      effectiveRank: DEFAULT_INPUT_EFFECTIVE_RANK,
      saturation: DEFAULT_INPUT_EFFECTIVE_RANK / DEFAULT_OUTPUT_DIM,
    };
  }

  return {
    rank: DEFAULT_OUTPUT_DIM,
    effectiveRank: Number.NaN,
    saturation: Number.NaN,
  };
}
