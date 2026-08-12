import type {
  CNNNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import { cnnRepetitionStats } from '../repetitionRank';
import { createEmptyDistanceIndexRank } from '../distanceIndexRank';
import { EPS, LINEAR_SATURATION_GAIN } from './utils/constants';
import { negativeRateFromNormal } from './utils/math';
import { getBiasVariance, getWeightVariance } from './utils/moduleStats';
import {
  getKnownDimension,
  inferSpatialOutputShape,
  readTensorShape,
} from './spatial';

export function forwardCNNStats(
  node: CNNNodeData,
  input: ModuleStats,
): ModuleStats | null {
  const inputShape = readTensorShape(input);
  const shape = inferSpatialOutputShape(
    input,
    node.outFeatures,
    node.kernelSize,
    node.stride,
    node.padding,
    node.dilation,
  );
  if (!shape) return null;

  const kernelArea = Math.max(1, node.kernelSize ** 2);
  const inputChannels = getKnownDimension(inputShape.channels)
    ?? (Number.isFinite(input.rank.outputRank)
      ? input.rank.outputRank
      : 1);
  const fanIn = Math.max(1, inputChannels * kernelArea);
  const fanOut = Math.max(1, node.outFeatures * kernelArea);
  const inputEffectiveRank = input.rank.effectiveRank || node.outFeatures;
  const saturation = 1 - Math.exp(
    (-LINEAR_SATURATION_GAIN * inputEffectiveRank)
      / Math.max(inputChannels, EPS),
  );
  const effectiveRank = inputChannels * saturation;
  const weightVariance = getWeightVariance(
    node.initializationMode,
    fanIn,
    fanOut,
  );
  const biasVariance = getBiasVariance(node);
  const mean = 0;
  const variance = fanIn
    * weightVariance
    * (input.distribution.variance + input.distribution.mean ** 2)
    + biasVariance;

  return {
    status: 'valid',
    rank: {
      outputRank: node.outFeatures,
      basisRank: inputChannels,
      effectiveRank,
      saturation,
      minRank: Math.min(
        input.rank.minRank ?? input.rank.outputRank,
        node.outFeatures,
      ),
    },
    distribution: {
      mean,
      variance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(mean, variance),
    },
    shape,
    adaptation: {
      repetition: cnnRepetitionStats(
        input,
        effectiveRank,
        node.kernelSize,
      ),
      distanceIndex: createEmptyDistanceIndexRank(),
    },
  };
}
