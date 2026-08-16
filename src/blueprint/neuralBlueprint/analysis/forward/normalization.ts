import type { ModuleStats } from '../../ModuleBaseNodeTypes';

export function forwardNormalizationStats(input: ModuleStats): ModuleStats {
  return {
    ...input,
    status: 'valid',
    distribution: normalizedDistribution(input.distribution.variance),
  };
}

export function normalizedDistribution(sourceVariance: number) {
  const hasSignal = Number.isFinite(sourceVariance) && sourceVariance > 0;
  return {
    mean: 0,
    variance: hasSignal ? 1 : 0,
    zeroRate: hasSignal ? 0 : 1,
    negativeRate: hasSignal ? 0.5 : 0,
  };
}
