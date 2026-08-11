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
      (-LINEAR_SATURATION_GAIN * gradient.rank.effectiveRank)
        / Math.max(fanIn, EPS),
    )
  );
  const minRank = Math.min(
    gradient.rank.minRank ?? gradient.rank.outputRank,
    fanIn,
  );
  const weightVariance = getWeightVariance(
    node.initializationMode,
    fanIn,
    fanOut,
  );
  const mean = 0;
  const variance = fanOut
    * weightVariance
    * (
      gradient.distribution.variance
        + gradient.distribution.mean ** 2
    );

  return {
    rank: {
      outputRank: fanIn,
      basisRank: fanIn,
      effectiveRank,
      saturation: effectiveRank / Math.max(fanIn, EPS),
      minRank,
    },
    distribution: {
      mean,
      variance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(mean, variance),
    },
  };
}
