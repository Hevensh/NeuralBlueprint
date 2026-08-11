import type { ModuleStatsBackward } from '../../ModuleBaseNodeTypes';
import { EPS } from '../forward/utils/constants';
import { clamp01, statsFromMoments } from '../forward/utils/math';

export function applyBackwardGate(
  gradient: ModuleStatsBackward,
  keepRateInput: number,
): ModuleStatsBackward {
  const keepRate = clamp01(keepRateInput);
  const outputMoments = statsFromMoments(
    gradient.distribution.mean * keepRate,
    (
      gradient.distribution.variance
        + gradient.distribution.mean ** 2
    ) * keepRate,
  );
  const saturation = Math.pow(
    clamp01(gradient.rank.saturation),
    keepRate,
  );

  return {
    rank: {
      ...gradient.rank,
      basisRank: gradient.rank.outputRank,
      effectiveRank: gradient.rank.outputRank * saturation,
      saturation,
    },
    distribution: {
      mean: outputMoments.mean,
      variance: outputMoments.variance,
      zeroRate: 1 - keepRate
        + keepRate * gradient.distribution.zeroRate,
      negativeRate: keepRate
        * (gradient.distribution.negativeRate ?? 0),
    },
  };
}

export function getDefaultOutputGradient(rank: number): ModuleStatsBackward {
  const validRank = Math.max(rank, EPS);

  return {
    rank: {
      outputRank: validRank,
      basisRank: validRank,
      effectiveRank: validRank,
      saturation: 1,
      minRank: validRank,
    },
    distribution: {
      mean: 0,
      variance: 1,
      zeroRate: 0,
      negativeRate: 0.5,
    },
  };
}
