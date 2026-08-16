import type { ModuleStatsBackward } from '../../ModuleBaseNodeTypes';
import { normalizedDistribution } from '../forward/normalization';

export function backwardNormalizationStats(
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  return {
    ...gradient,
    distribution: normalizedDistribution(gradient.distribution.variance),
  };
}
