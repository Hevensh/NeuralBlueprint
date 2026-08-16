import type { ModuleStats } from '../../../ModuleBaseNodeTypes';
import { createEmptyRepetitionStats } from '../../repetitionRank';
import { createEmptyDistanceIndexRank } from '../../distanceIndexRank';
import { createSpatialViewFromShape } from '../../spatialView';

export const DEFAULT_RANK = 64;
export const DEFAULT_INPUT_EFFECTIVE_RANK = 32;
export const EPS = 1e-8;
export const LINEAR_SATURATION_GAIN = 1;
export const RELU_STANDARD_NORMAL_CORR = 0.853;
export const RELU_CORR_GAMMA = Math.log(RELU_STANDARD_NORMAL_CORR) / Math.log(0.5);

export const DEFAULT_INPUT_STATS: ModuleStats = {
  status: 'valid',
  rank: {
    outputRank: DEFAULT_RANK,
    basisRank: DEFAULT_RANK,
    effectiveRank: DEFAULT_INPUT_EFFECTIVE_RANK,
    saturation: DEFAULT_INPUT_EFFECTIVE_RANK / DEFAULT_RANK,
    minRank: DEFAULT_RANK,
  },
  distribution: {
    mean: 0,
    variance: 1,
    zeroRate: 0,
    negativeRate: 0.5,
  },
  shape: {
    time: 'absent',
    channels: DEFAULT_RANK,
    height: 'absent',
    width: 'absent',
  },
  spatialView: createSpatialViewFromShape({
    time: 'absent',
    channels: DEFAULT_RANK,
    height: 'absent',
    width: 'absent',
  }),
  adaptation: {
    repetition: createEmptyRepetitionStats(),
    distanceIndex: createEmptyDistanceIndexRank(),
  },
};

export const EMPTY_STATS: ModuleStats = {
  status: 'unknown',
  rank: {
    outputRank: Number.NaN,
    basisRank: Number.NaN,
    effectiveRank: Number.NaN,
    saturation: Number.NaN,
    minRank: Number.NaN,
  },
  distribution: {
    mean: Number.NaN,
    variance: Number.NaN,
    zeroRate: Number.NaN,
    negativeRate: Number.NaN,
  },
  shape: {
    time: 'absent',
    channels: 'unknown',
    height: 'absent',
    width: 'absent',
  },
  spatialView: createSpatialViewFromShape({
    time: 'absent',
    channels: 'unknown',
    height: 'absent',
    width: 'absent',
  }),
  adaptation: {
    repetition: createEmptyRepetitionStats(),
    distanceIndex: createEmptyDistanceIndexRank(),
  },
};
