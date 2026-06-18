import type { ModuleStatsBackward } from '../../ModuleBaseNodeTypes';
import { EPS } from '../forward/utils/constants';
import { clamp01, statsFromMoments } from '../forward/utils/math';

export function applyBackwardGate(
  gradient: ModuleStatsBackward,
  keepRateInput: number,
): ModuleStatsBackward {
  const keepRate = clamp01(keepRateInput);
  const outputMoments = statsFromMoments(
    gradient.mean * keepRate,
    (gradient.variance + gradient.mean ** 2) * keepRate,
  );
  const saturation = Math.pow(
    clamp01(gradient.saturation),
    keepRate,
  );

  return {
    rank: gradient.rank,
    effectiveRank: gradient.rank * saturation,
    saturation,
    minRank: gradient.minRank,
    mean: outputMoments.mean,
    variance: outputMoments.variance,
    zeroRate: 1 - keepRate + keepRate * gradient.zeroRate,
    negativeRate: keepRate * (gradient.negativeRate ?? 0),
  };
}

export function getDefaultOutputGradient(rank: number): ModuleStatsBackward {
  const validRank = Math.max(rank, EPS);

  return {
    rank: validRank,
    effectiveRank: validRank,
    saturation: 1,
    minRank: validRank,
    mean: 0,
    variance: 1,
    zeroRate: 0,
    negativeRate: 0.5,
  };
}
