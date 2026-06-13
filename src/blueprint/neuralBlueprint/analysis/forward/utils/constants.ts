import type { ModuleStats } from '../../../ModuleBaseNodeTypes';

export const DEFAULT_RANK = 64;
export const DEFAULT_INPUT_EFFECTIVE_RANK = 32;
export const EPS = 1e-8;
export const LINEAR_SATURATION_GAIN = 1;
export const RELU_STANDARD_NORMAL_CORR = 0.853;
export const RELU_CORR_GAMMA = Math.log(RELU_STANDARD_NORMAL_CORR) / Math.log(0.5);

export const DEFAULT_INPUT_STATS: ModuleStats = {
  rank: DEFAULT_RANK,
  effectiveRank: DEFAULT_INPUT_EFFECTIVE_RANK,
  saturation: DEFAULT_INPUT_EFFECTIVE_RANK / DEFAULT_RANK,
  minRank: DEFAULT_RANK,
  mean: 0,
  variance: 1,
  zeroRate: 0,
  negativeRate: 0.5,
};

export const EMPTY_STATS: ModuleStats = {
  rank: Number.NaN,
  effectiveRank: Number.NaN,
  saturation: Number.NaN,
  minRank: Number.NaN,
  mean: Number.NaN,
  variance: Number.NaN,
  zeroRate: Number.NaN,
  negativeRate: Number.NaN,
};
