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
  const nonZeroRate = clamp01(1 - input.distribution.zeroRate);
  if (nonZeroRate <= EPS) {
    return 1;
  }

  return clamp01((input.distribution.negativeRate ?? 0) / nonZeroRate);
}

export function getNonZeroRate(input: ModuleStats) {
  return clamp01(1 - input.distribution.zeroRate);
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

  const mean = input.distribution.mean / nonZeroRate;
  const secondMoment = (
    input.distribution.variance + input.distribution.mean ** 2
  ) / nonZeroRate;

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

/**
 * Estimate how much inference complexity a ReLU gate adds to a path.
 * A balanced positive/negative input activates both sides of the gate and
 * contributes a quarter point; one-sided input behaves closer to a linear or
 * constant map. Zero mass is excluded from this score because inference
 * complexity measures the sign split, while effective rank handles sparsity.
 */
export function getReluInferenceStageAdvance(
  input: Pick<ModuleStats, 'distribution'> | undefined,
) {
  if (!input) return 0;

  const zeroRate = finiteProbability(input.distribution.zeroRate);
  const negativeRate = finiteProbability(input.distribution.negativeRate);
  const nonZeroRate = 1 - zeroRate;
  if (nonZeroRate <= EPS) return 0;

  const conditionalNegativeRate = clamp01(negativeRate / nonZeroRate);
  const gateUncertainty = conditionalNegativeRate
    * (1 - conditionalNegativeRate);
  return roundInferenceStage(gateUncertainty);
}

export function getDropoutInferenceStageAdvance(dropoutRateInput: number) {
  const dropoutRate = finiteProbability(dropoutRateInput);
  return roundInferenceStage(dropoutRate * (1 - dropoutRate));
}

export function getNonZeroTransitionSaturation(
  input: Pick<ModuleStats, 'rank' | 'distribution'>,
  outputZeroRateInput: number,
) {
  const beforeNonZeroRate = clamp01(1 - input.distribution.zeroRate);
  const afterNonZeroRate = clamp01(1 - outputZeroRateInput);
  if (beforeNonZeroRate <= EPS) return 1;
  return Math.pow(
    clamp01(input.rank.saturation),
    afterNonZeroRate / beforeNonZeroRate,
  );
}

export function getDistributionTransitionSaturation(
  input: Pick<ModuleStats, 'rank' | 'distribution'>,
  outputDistribution: Pick<ModuleStats['distribution'], 'zeroRate'>,
) {
  return getNonZeroTransitionSaturation(
    input,
    outputDistribution.zeroRate,
  );
}

export function getGateLinearCorr(input: ModuleStats, outputSaturation: number) {
  const inputSaturation = clamp01(input.rank.saturation);
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

export function isNonNegative(
  stats: Pick<ModuleStats, 'distribution'>,
) {
  return (stats.distribution.negativeRate ?? 0) <= 0;
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

function finiteProbability(value: number | undefined) {
  return Number.isFinite(value) ? clamp01(value as number) : 0;
}

function roundInferenceStage(value: number) {
  return Number(Math.max(0, value).toFixed(3));
}
