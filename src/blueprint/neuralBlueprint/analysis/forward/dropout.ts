import type {
  DropoutNodeData,
  ModuleNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import { preserveRepetitionRank } from '../repetitionRank';
import { EPS } from './utils/constants';
import {
  clamp01,
  getDropoutSaturation,
  getGateLinearCorr,
  statsFromMoments,
} from './utils/math';

export function forwardDropoutStats(
  node: DropoutNodeData,
  input: ModuleStats,
  inputNode?: ModuleNodeData,
): ModuleStats {
  const dropoutRate = clamp01(node.dropoutRate);
  const keepRate = 1 - dropoutRate;

  if (keepRate <= EPS) {
    return {
      rank: input.rank,
      dimLabel: 'normal',
      effectiveRank: input.rank,
      saturation: 1,
      shape: input.shape,
      repetitionRank: { high: 0, medium: 0, low: 0 },
      minRank: input.minRank,
      mean: 0,
      variance: 0,
      zeroRate: 1,
      negativeRate: 0,
      inputElementCorr: inputNode ? { [inputNode.id]: 0 } : undefined,
      inputLinearCorr: inputNode ? { [inputNode.id]: 0 } : undefined,
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
    rank: input.rank,
    dimLabel: 'normal',
    effectiveRank,
    saturation,
    shape: input.shape,
    repetitionRank: preserveRepetitionRank(input, effectiveRank),
    minRank: input.minRank,
    mean: outputMoments.mean,
    variance: outputMoments.variance,
    zeroRate: dropoutRate + keepRate * input.zeroRate,
    negativeRate: keepRate * (input.negativeRate ?? 0),
    inputElementCorr: inputNode ? { [inputNode.id]: Math.sqrt(keepRate) } : undefined,
    inputLinearCorr: inputNode ? { [inputNode.id]: rankCorr } : undefined,
  };
}
