import type { ModuleStats } from '../../../ModuleBaseNodeTypes';
import { EPS, RELU_CORR_GAMMA } from './constants';

export function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function getReluCorrByNegativeRate(negativeRateInput: number | undefined) {
  const negativeRate = negativeRateInput ?? 0.5;
  const removedMass = smoothstep(negativeRate);
  const preservedMass = 1 - removedMass;

  return preservedMass <= 0
    ? 0
    : Math.pow(preservedMass, RELU_CORR_GAMMA);
}

export function getConditionalNegativeRate(input: ModuleStats) {
  const nonZeroRate = clamp01(1 - input.zeroRate);
  if (nonZeroRate <= EPS) {
    return 1;
  }

  return clamp01((input.negativeRate ?? 0) / nonZeroRate);
}

export function getNonZeroRate(input: ModuleStats) {
  return clamp01(1 - input.zeroRate);
}

export function statsFromMoments(mean: number, secondMoment: number) {
  return {
    mean,
    variance: Math.max(secondMoment - mean ** 2, 0),
  };
}

export function getNonZeroContinuousMoments(input: ModuleStats) {
  const nonZeroRate = getNonZeroRate(input);
  if (nonZeroRate <= EPS) {
    return {
      nonZeroRate,
      mean: 0,
      variance: 0,
      secondMoment: 0,
    };
  }

  const mean = input.mean / nonZeroRate;
  const secondMoment = (input.variance + input.mean ** 2) / nonZeroRate;

  return {
    nonZeroRate,
    mean,
    secondMoment,
    variance: Math.max(secondMoment - mean ** 2, 0),
  };
}

export function getConditionalPositiveRate(input: ModuleStats) {
  return 1 - getConditionalNegativeRate(input);
}

export function getReluSaturation(input: ModuleStats) {
  return Math.pow(
    clamp01(input.saturation),
    getConditionalPositiveRate(input),
  );
}

export function getDropoutSaturation(input: ModuleStats, dropoutRate: number) {
  const beforeNonZeroRate = clamp01(1 - input.zeroRate);
  const afterNonZeroRate = beforeNonZeroRate * (1 - clamp01(dropoutRate));
  if (beforeNonZeroRate <= EPS) {
    return 0;
  }

  return Math.pow(
    clamp01(input.saturation),
    afterNonZeroRate / beforeNonZeroRate,
  );
}

export function getGateLinearCorr(input: ModuleStats, outputSaturation: number) {
  const inputSaturation = clamp01(input.saturation);
  const nextSaturation = clamp01(outputSaturation);
  if (nextSaturation <= EPS) {
    return 0;
  }

  return clamp01(inputSaturation / nextSaturation);
}

export function estimateSumNegativeRate(mean: number, variance: number) {
  const std = Math.sqrt(Math.max(variance, EPS));
  return 1 / (1 + Math.exp((2 * mean) / std));
}

export function negativeRateFromNormal(mean: number, variance: number) {
  return normalCdf(-mean / Math.sqrt(Math.max(variance, 0) + EPS));
}

export function isNonNegative(stats: ModuleStats) {
  return (stats.negativeRate ?? 0) <= 0;
}

export function normalPdf(value: number) {
  return Math.exp(-0.5 * value ** 2) / Math.sqrt(2 * Math.PI);
}

export function normalCdf(value: number) {
  return 0.5 * (1 + erf(value / Math.SQRT2));
}

function erf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}
