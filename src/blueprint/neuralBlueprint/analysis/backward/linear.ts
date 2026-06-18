import type {
  ModuleStatsBackwardContext,
  ModuleStatsBackwardResult,
} from '../../ModuleBaseNodeTypes';
import { EPS, LINEAR_SATURATION_GAIN } from '../forward/utils/constants';
import { negativeRateFromNormal } from '../forward/utils/math';
import {
  getFanIn,
  getOutputRank,
  getWeightVariance,
} from '../forward/utils/moduleStats';

export function backwardLinearStats({
  node,
  gradient,
}: ModuleStatsBackwardContext): ModuleStatsBackwardResult {
  const fanIn = getFanIn(node);
  const fanOut = getOutputRank(node);
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
    stats: {
      rank: fanIn,
      effectiveRank,
      saturation: effectiveRank / Math.max(fanIn, EPS),
      minRank,
      mean,
      variance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(mean, variance),
    },
  };
}
