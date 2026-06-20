import type {
  DropoutNodeData,
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { EMPTY_STATS, EPS } from './utils/constants';
import {
  clamp01,
  getDropoutSaturation,
  getGateLinearCorr,
  statsFromMoments,
} from './utils/math';

export function forwardDropoutStats({
  node,
  inputs,
  inputNodes,
}: ModuleStatsForwardContext<DropoutNodeData>): ModuleStatsForwardResult {
  const input = inputs[0] ?? EMPTY_STATS;
  const inputNode = inputNodes[0];
  const dropoutRate = clamp01(node.dropoutRate);
  const keepRate = 1 - dropoutRate;

  if (keepRate <= EPS) {
    return {
      stats: {
        rank: input.rank,
        dimLabel: 'normal',
        effectiveRank: input.rank,
        saturation: 1,
        minRank: input.minRank,
        mean: 0,
        variance: 0,
        zeroRate: 1,
        negativeRate: 0,
        inputElementCorr: inputNode ? { [inputNode.id]: 0 } : undefined,
        inputLinearCorr: inputNode ? { [inputNode.id]: 0 } : undefined,
      },
    };
  }

  const saturation = getDropoutSaturation(input, dropoutRate);
  const effectiveRank = input.rank * saturation;
  const rankCorr = getGateLinearCorr(input, saturation);
  const outputMoments = statsFromMoments(
    input.mean * keepRate,
    (input.variance + input.mean ** 2) * keepRate,
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
      zeroRate: dropoutRate + keepRate * input.zeroRate,
      negativeRate: keepRate * (input.negativeRate ?? 0),
      inputElementCorr: inputNode ? { [inputNode.id]: Math.sqrt(keepRate) } : undefined,
      inputLinearCorr: inputNode ? { [inputNode.id]: rankCorr } : undefined,
    },
  };
}
