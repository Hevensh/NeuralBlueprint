import type { ModuleStats } from '../../../ModuleBaseNodeTypes';
import { EPS, RELU_CORR_GAMMA } from './constants';

export function getReluSaturationRho(input?: ModuleStats) {
  if (!input) {
    return 0.5;
  }

  const negativeRate = input.negativeRate ?? 0.5;
  const positiveRate = 1 - negativeRate;
  const magnitude = Math.abs(input.mean) + Math.sqrt(Math.max(input.variance, 0));
  const mPlus = positiveRate * magnitude;
  const mMinus = negativeRate * magnitude;

  if (mPlus + mMinus <= EPS) {
    return 0;
  }

  return mPlus / (mPlus + mMinus);
}

export function getReluCorrByNegativeRate(negativeRateInput: number | undefined) {
  const negativeRate = negativeRateInput ?? 0.5;
  const removedMass = smoothstep(negativeRate);
  const preservedMass = 1 - removedMass;

  return preservedMass <= 0
    ? 0
    : Math.pow(preservedMass, RELU_CORR_GAMMA);
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
