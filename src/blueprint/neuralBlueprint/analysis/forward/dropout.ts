import type {
  DropoutNodeData,
  ModuleNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import {
  createEmptyRepetitionStats,
  preserveRepetitionStats,
} from '../repetitionRank';
import { createEmptyDistanceIndexRank } from '../distanceIndexRank';
import { dropoutDistribution } from './distributionSketch';
import { EPS } from './utils/constants';
import {
  clamp01,
  getDistributionTransitionSaturation,
  getGateLinearCorr,
} from './utils/math';

export function forwardDropoutStats(
  node: DropoutNodeData,
  input: ModuleStats,
  inputNode?: ModuleNodeData,
): ModuleStats {
  const dropoutRate = clamp01(node.dropoutRate);
  const keepRate = 1 - dropoutRate;
  const distribution = dropoutDistribution(
    input.distribution,
    dropoutRate,
  );

  if (keepRate <= EPS) {
    return {
      status: 'valid',
      rank: {
        ...input.rank,
        basisRank: input.rank.outputRank,
        effectiveRank: input.rank.outputRank,
        saturation: 1,
      },
      shape: input.shape,
      spatialView: input.spatialView,
      adaptation: {
        repetition: createEmptyRepetitionStats(),
        distanceIndex: createEmptyDistanceIndexRank(),
      },
      distribution,
      inputElementCorr: inputNode ? { [inputNode.id]: 0 } : undefined,
      inputLinearCorr: inputNode ? { [inputNode.id]: 0 } : undefined,
    };
  }

  const saturation = getDistributionTransitionSaturation(
    input,
    distribution,
  );
  const effectiveRank = input.rank.outputRank * saturation;
  const rankCorr = getGateLinearCorr(input, saturation);

  return {
    status: 'valid',
    rank: {
      ...input.rank,
      basisRank: input.rank.outputRank,
      effectiveRank,
      saturation,
    },
    shape: input.shape,
    spatialView: input.spatialView,
    adaptation: {
      repetition: preserveRepetitionStats(input, effectiveRank),
      distanceIndex: createEmptyDistanceIndexRank(),
    },
    distribution,
    inputElementCorr: inputNode ? { [inputNode.id]: Math.sqrt(keepRate) } : undefined,
    inputLinearCorr: inputNode ? { [inputNode.id]: rankCorr } : undefined,
  };
}
