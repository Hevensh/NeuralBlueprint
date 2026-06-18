import type {
  BackwardOutputPairStats,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';
import { EPS } from '../forward/utils/constants';
import { estimateSumNegativeRate, isNonNegative } from '../forward/utils/math';

export function aggregateBackwardStats(
  gradients: ModuleStatsBackward[],
  pairs: BackwardOutputPairStats[],
): ModuleStatsBackward {
  if (gradients.length === 1) {
    return gradients[0];
  }

  const rank = gradients.reduce(
    (maxRank, gradient) => Math.max(maxRank, gradient.rank),
    0,
  );
  const effectiveRank = gradients.reduce(
    (sum, gradient) => sum + gradient.effectiveRank,
    0,
  );
  const minRank = gradients.reduce(
    (sum, gradient) => sum + (gradient.minRank ?? gradient.rank),
    0,
  );
  const mean = gradients.reduce((sum, gradient) => sum + gradient.mean, 0);
  const variance = gradients.reduce(
    (sum, gradient) => sum + gradient.variance,
    pairs.reduce((sum, pair) => sum + 2 * pair.covariance, 0),
  );
  const allNonNegative = gradients.every(isNonNegative);

  return {
    rank,
    effectiveRank,
    saturation: effectiveRank / Math.max(rank, EPS),
    minRank,
    mean,
    variance,
    zeroRate: allNonNegative
      ? gradients.reduce(
        (product, gradient) => product * gradient.zeroRate,
        1,
      )
      : 0,
    negativeRate: allNonNegative
      ? 0
      : estimateSumNegativeRate(mean, variance),
  };
}
