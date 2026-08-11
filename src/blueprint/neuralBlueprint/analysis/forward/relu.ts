import type {
  ModuleNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import { preserveRepetitionStats } from '../repetitionRank';
import { reluDistribution } from './distributionSketch';
import {
  getDistributionTransitionSaturation,
  getGateLinearCorr,
  getReluCorrByNegativeRate,
  isNonNegative,
} from './utils/math';

export function forwardReLUStats(
  input: ModuleStats,
  inputNode?: ModuleNodeData,
): ModuleStats {
  const directCorr = getReluCorrByNegativeRate(
    input.distribution.negativeRate,
  );
  const distribution = reluDistribution(input.distribution);
  const saturation = getDistributionTransitionSaturation(
    input,
    distribution,
  );
  const effectiveRank = input.rank.outputRank * saturation;
  const rankCorr = getGateLinearCorr(input, saturation);

  if (isNonNegative(input)) {
    return {
      ...input,
      status: 'valid',
      distribution,
      inputElementCorr: inputNode ? { [inputNode.id]: 1 } : undefined,
      inputLinearCorr: inputNode ? { [inputNode.id]: 1 } : undefined,
    };
  }

  return {
    status: 'valid',
    rank: {
      ...input.rank,
      basisRank: input.rank.outputRank,
      effectiveRank,
      saturation,
    },
    shape: input.shape,
    adaptation: {
      repetition: preserveRepetitionStats(input, effectiveRank),
    },
    distribution,
    inputElementCorr: inputNode ? { [inputNode.id]: directCorr } : undefined,
    inputLinearCorr: inputNode ? { [inputNode.id]: rankCorr } : undefined,
  };
}
