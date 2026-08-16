import type {
  ModuleStats,
  PoolingNodeData,
} from '../../ModuleBaseNodeTypes';
import { createEmptyDistanceIndexRank } from '../distanceIndexRank';
import { getForwardPoolingMoments } from './poolingMoments';
import {
  getKnownDimension,
  inferSpatialOutputShape,
  readTensorShape,
} from './spatial';
import { EPS } from './utils/constants';
import { getDistributionTransitionSaturation } from './utils/math';
import {
  advanceSpatialView,
  spatialViewRepetitionStats,
} from '../spatialView';

export function forwardPoolingStats(
  node: PoolingNodeData,
  input: ModuleStats,
): ModuleStats | null {
  const inputShape = readTensorShape(input);
  const shape = inferSpatialOutputShape(
    input,
    inputShape.channels,
    node.kernelSize,
    node.stride,
    node.padding,
  );
  if (!shape) return null;
  const moments = getForwardPoolingMoments(
    input,
    Math.max(1, Math.round(node.kernelSize)) ** 2,
    node.poolMode,
  );
  const rank = getKnownDimension(inputShape.channels) ?? Number.NaN;
  const saturation = node.poolMode === 'average'
    ? input.rank.saturation
    : getDistributionTransitionSaturation(input, moments);
  const effectiveRank = node.poolMode === 'average'
    ? input.rank.effectiveRank
    : rank * saturation;
  const spatialView = advanceSpatialView(input.spatialView, shape, {
    kernel: { height: node.kernelSize, width: node.kernelSize },
    stride: { height: node.stride, width: node.stride },
    learned: false,
  });

  return {
    ...input,
    rank: {
      outputRank: rank,
      basisRank: node.poolMode === 'average'
        ? input.rank.basisRank
        : rank,
      effectiveRank,
      saturation: node.poolMode === 'average'
        ? input.rank.saturation
        : Number.isFinite(rank)
          ? effectiveRank / Math.max(rank, EPS)
          : saturation,
      minRank: input.rank.minRank,
    },
    distribution: moments,
    shape,
    spatialView,
    adaptation: {
      repetition: spatialViewRepetitionStats(spatialView),
      distanceIndex: createEmptyDistanceIndexRank(),
    },
  };
}
