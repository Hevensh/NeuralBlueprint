import type {
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { EMPTY_STATS, EPS } from './utils/constants';
import {
  getReluCorrByNegativeRate,
  getReluSaturationRho,
  isNonNegative,
  negativeRateFromNormal,
  normalCdf,
  normalPdf,
} from './utils/math';

export function forwardReLUStats({
  inputs,
  inputNodes,
}: ModuleStatsForwardContext): ModuleStatsForwardResult {
  const input = inputs[0] ?? EMPTY_STATS;
  const inputNode = inputNodes[0];
  const directCorr = getReluCorrByNegativeRate(input.negativeRate);
  const reluRankRho = getReluSaturationRho(input);
  const saturation = input.saturation ** reluRankRho;
  const effectiveRank = input.rank * saturation;

  if (isNonNegative(input)) {
    return {
      stats: {
        ...input,
        negativeRate: 0,
        inputElementCorr: inputNode ? { [inputNode.id]: 1 } : undefined,
        inputLinearCorr: inputNode ? { [inputNode.id]: 1 } : undefined,
      },
    };
  }

  const std = Math.sqrt(Math.max(input.variance, 0) + EPS);
  const alpha = input.mean / std;
  const phi = normalPdf(alpha);
  const Phi = normalCdf(alpha);
  const mean = std * phi + input.mean * Phi;
  const secondMoment = (input.mean ** 2 + input.variance) * Phi + input.mean * std * phi;

  return {
    stats: {
      rank: input.rank,
      effectiveRank,
      saturation,
      minRank: input.minRank,
      mean,
      variance: Math.max(secondMoment - mean ** 2, 0),
      zeroRate: input.zeroRate + (input.negativeRate ?? negativeRateFromNormal(input.mean, input.variance)),
      negativeRate: 0,
      inputElementCorr: inputNode ? { [inputNode.id]: directCorr } : undefined,
      inputLinearCorr: inputNode ? { [inputNode.id]: directCorr } : undefined,
    },
  };
}
