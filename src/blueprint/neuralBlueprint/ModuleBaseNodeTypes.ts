import type { Node } from '@xyflow/react';
import type { NeuralBlueprintPageType } from '../PageTypes';

export type ModuleBaseNodeKind = 'Input' | 'Linear' | 'ReLU' | 'Sum' | 'Output';
export type InputNormalizationMode = '0-1' | 'standard';
export type LinearInitializationMode = 'normal' | 'xavier';
export type BiasInitializationMode = 'zeros' | 'normal' | 'xavier';
export type ModuleForwardFunction = (input: unknown) => unknown;
export type ModuleBackwardFunction = (gradient: unknown) => unknown;

export interface ModuleRankStats {
  rank: number;
  effectiveRank: number;
  saturation: number;
}

export interface ModuleVarianceStats {
  mean: number;
  variance: number;
  zeroRate: number;
  negativeRate?: number;
}

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
  normalizationMode?: InputNormalizationMode;
  initializationMode?: LinearInitializationMode;
  biasInitializationMode?: BiasInitializationMode;
  rankStats?: ModuleRankStats;
  varianceStats?: ModuleVarianceStats;
  position: {
    x: number;
    y: number;
  };
}

export type ModuleBaseNode = Node<ModuleBaseNodeData>;
