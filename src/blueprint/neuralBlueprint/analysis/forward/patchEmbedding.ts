import type {
  ModuleStats,
  PatchEmbeddingNodeData,
} from '../../ModuleBaseNodeTypes';
import { createEmptyDistanceIndexRank } from '../distanceIndexRank';
import {
  advanceSpatialView,
  createPatchFrame,
  spatialViewRepetitionStats,
} from '../spatialView';
import {
  getKnownDimension,
  inferPatchEmbeddingShape,
  readTensorShape,
} from './spatial';
import { EPS, LINEAR_SATURATION_GAIN } from './utils/constants';
import { negativeRateFromNormal } from './utils/math';
import { getBiasVariance, getWeightVariance } from './utils/moduleStats';

export function forwardPatchEmbeddingStats(
  node: PatchEmbeddingNodeData,
  input: ModuleStats,
): ModuleStats | null {
  const inputShape = readTensorShape(input);
  const inferred = inferPatchEmbeddingShape(
    input,
    node.outFeatures,
    node.patchHeight,
    node.patchWidth,
    node.strideHeight,
    node.strideWidth,
  );
  if (!inferred) return null;

  const patchArea = Math.max(
    1,
    Math.round(node.patchHeight) * Math.round(node.patchWidth),
  );
  const inputChannels = getKnownDimension(inputShape.channels)
    ?? (Number.isFinite(input.rank.outputRank) ? input.rank.outputRank : 1);
  const fanIn = Math.max(1, inputChannels * patchArea);
  const fanOut = Math.max(1, node.outFeatures * patchArea);
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
  const spatialView = advanceSpatialView(input.spatialView, inferred.gridShape, {
    kernel: { height: node.patchHeight, width: node.patchWidth },
    stride: { height: node.strideHeight, width: node.strideWidth },
    learned: true,
  });
  spatialView.patchFrame = createPatchFrame(
    spatialView,
    { height: node.patchHeight, width: node.patchWidth },
    { height: node.strideHeight, width: node.strideWidth },
  );

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
    shape: inferred.shape,
    spatialView,
    distribution: {
      mean,
      variance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(mean, variance),
    },
    adaptation: {
      repetition: spatialViewRepetitionStats(spatialView),
      distanceIndex: createEmptyDistanceIndexRank(),
    },
  };
}
