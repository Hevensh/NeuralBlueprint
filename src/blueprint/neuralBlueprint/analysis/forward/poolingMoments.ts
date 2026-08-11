import type {
  ModuleStats,
  PoolMode,
} from '../../ModuleBaseNodeTypes';
import { EPS } from './utils/constants';
import {
  clamp01,
  negativeRateFromNormal,
  normalCdf,
  normalPdf,
} from './utils/math';

interface PoolingMoments {
  mean: number;
  variance: number;
  zeroRate: number;
  negativeRate: number;
}

const maxNormalMomentCache = new Map<number, {
  mean: number;
  variance: number;
}>();

export function getForwardPoolingMoments(
  input: ModuleStats,
  elementCountInput: number,
  mode: PoolMode,
): PoolingMoments {
  const elementCount = Math.max(1, Math.round(elementCountInput));
  if (elementCount === 1) {
    return {
      mean: input.mean,
      variance: input.variance,
      zeroRate: input.zeroRate,
      negativeRate: input.negativeRate ?? negativeRateFromNormal(
        input.mean,
        input.variance,
      ),
    };
  }
  if (mode === 'average') {
    const variance = input.variance / elementCount;
    return {
      mean: input.mean,
      variance,
      zeroRate: Math.pow(clamp01(input.zeroRate), elementCount),
      negativeRate: negativeRateFromNormal(input.mean, variance),
    };
  }

  const standardMoments = getMaxStandardNormalMoments(elementCount);
  const standardDeviation = Math.sqrt(Math.max(input.variance, 0));
  const negativeRate = clamp01(
    input.negativeRate
      ?? negativeRateFromNormal(input.mean, input.variance),
  );
  const nonPositiveRate = clamp01(negativeRate + input.zeroRate);
  return {
    mean: input.mean + standardDeviation * standardMoments.mean,
    variance: input.variance * standardMoments.variance,
    zeroRate: Math.max(
      0,
      Math.pow(nonPositiveRate, elementCount)
        - Math.pow(negativeRate, elementCount),
    ),
    negativeRate: Math.pow(negativeRate, elementCount),
  };
}

function getMaxStandardNormalMoments(elementCount: number) {
  const cached = maxNormalMomentCache.get(elementCount);
  if (cached) return cached;

  const lower = -8;
  const upper = 8;
  const steps = 1024;
  const step = (upper - lower) / steps;
  let mass = 0;
  let firstMoment = 0;
  let secondMoment = 0;

  for (let index = 0; index <= steps; index += 1) {
    const value = lower + index * step;
    const cdf = Math.max(normalCdf(value), EPS);
    const density = elementCount
      * normalPdf(value)
      * Math.exp((elementCount - 1) * Math.log(cdf));
    const weight = index === 0 || index === steps
      ? 1
      : index % 2 === 0
        ? 2
        : 4;
    mass += weight * density;
    firstMoment += weight * value * density;
    secondMoment += weight * value ** 2 * density;
  }

  const scale = step / 3;
  const normalizedMass = Math.max(mass * scale, EPS);
  const mean = (firstMoment * scale) / normalizedMass;
  const second = (secondMoment * scale) / normalizedMass;
  const result = {
    mean,
    variance: Math.max(second - mean ** 2, 0),
  };
  maxNormalMomentCache.set(elementCount, result);
  return result;
}
