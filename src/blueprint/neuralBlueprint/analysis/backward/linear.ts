import type {
  LinearNodeData,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';
import { EPS, LINEAR_SATURATION_GAIN } from '../forward/utils/constants';
import { negativeRateFromNormal } from '../forward/utils/math';
import {
  getFanIn,
  getWeightVariance,
} from '../forward/utils/moduleStats';

export function backwardLinearStats(
  node: LinearNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  const fanIn = getFanIn(node);
  const fanOut = node.outFeatures;
  const effectiveRank = fanIn * (
    1 - Math.exp(
      (-LINEAR_SATURATION_GAIN * gradient.effectiveRank)
        / Math.max(fanIn, EPS),
    )
  );
  const minRank = Math.min(gradient.minRank ?? gradient.rank, fanIn);
  const weightVariance = getWeightVariance(
    node.initializationMode,
    fanIn,
    fanOut,
  );
  const mean = 0;
  const variance = fanOut
    * weightVariance
    * (gradient.variance + gradient.mean ** 2);

  return {
    rank: fanIn,
    effectiveRank,
    saturation: effectiveRank / Math.max(fanIn, EPS),
    minRank,
    mean,
    variance,
    zeroRate: 0,
    negativeRate: negativeRateFromNormal(mean, variance),
  };
}
