import type {
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
  ReLUNodeData,
} from '../../ModuleBaseNodeTypes';
import { EMPTY_STATS, EPS } from './utils/constants';
import {
  getGateLinearCorr,
  getNonZeroContinuousMoments,
  getReluCorrByNegativeRate,
  getReluSaturation,
  isNonNegative,
  negativeRateFromNormal,
  normalCdf,
  normalPdf,
  statsFromMoments,
} from './utils/math';

export function forwardReLUStats({
  inputs,
  inputNodes,
}: ModuleStatsForwardContext<ReLUNodeData>): ModuleStatsForwardResult {
  const input = inputs[0] ?? EMPTY_STATS;
  const inputNode = inputNodes[0];
  const directCorr = getReluCorrByNegativeRate(input.negativeRate);
  const saturation = getReluSaturation(input);
  const effectiveRank = input.rank * saturation;
  const rankCorr = getGateLinearCorr(input, saturation);

  if (isNonNegative(input)) {
    return {
      stats: {
        ...input,
        dimLabel: 'normal',
        negativeRate: 0,
        inputElementCorr: inputNode ? { [inputNode.id]: 1 } : undefined,
        inputLinearCorr: inputNode ? { [inputNode.id]: 1 } : undefined,
      },
    };
  }

  const continuous = getNonZeroContinuousMoments(input);
  const std = Math.sqrt(continuous.variance + EPS);
  const alpha = continuous.mean / std;
  const phi = normalPdf(alpha);
  const Phi = normalCdf(alpha);
  const reluMean = std * phi + continuous.mean * Phi;
  const reluSecondMoment = continuous.secondMoment * Phi + continuous.mean * std * phi;
  const outputMoments = statsFromMoments(
    continuous.nonZeroRate * reluMean,
    continuous.nonZeroRate * reluSecondMoment,
  );

  return {
    stats: {
      rank: input.rank,
      dimLabel: 'normal',
      effectiveRank,
      saturation,
      minRank: input.minRank,
      mean: outputMoments.mean,
      variance: outputMoments.variance,
      zeroRate: input.zeroRate + (input.negativeRate ?? negativeRateFromNormal(input.mean, input.variance)),
      negativeRate: 0,
      inputElementCorr: inputNode ? { [inputNode.id]: directCorr } : undefined,
      inputLinearCorr: inputNode ? { [inputNode.id]: rankCorr } : undefined,
    },
  };
}
