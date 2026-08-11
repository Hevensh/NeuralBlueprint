import type {
  ModuleDistributionStats,
  ModuleStats,
  PoolMode,
} from '../../ModuleBaseNodeTypes';
import { maxPoolDistribution } from './distributionSketch';
import {
  clamp01,
  negativeRateFromNormal,
} from './utils/math';

export function getForwardPoolingMoments(
  input: ModuleStats,
  elementCountInput: number,
  mode: PoolMode,
): ModuleDistributionStats {
  const elementCount = Math.max(1, Math.round(elementCountInput));
  if (elementCount === 1) {
    if (mode === 'max') {
      return maxPoolDistribution(input.distribution, elementCount);
    }
    return {
      mean: input.distribution.mean,
      variance: input.distribution.variance,
      zeroRate: input.distribution.zeroRate,
      negativeRate: input.distribution.negativeRate ?? negativeRateFromNormal(
        input.distribution.mean,
        input.distribution.variance,
      ),
    };
  }
  if (mode === 'average') {
    const variance = input.distribution.variance / elementCount;
    return {
      mean: input.distribution.mean,
      variance,
      zeroRate: Math.pow(
        clamp01(input.distribution.zeroRate),
        elementCount,
      ),
      negativeRate: negativeRateFromNormal(
        input.distribution.mean,
        variance,
      ),
    };
  }
  return maxPoolDistribution(input.distribution, elementCount);
}
