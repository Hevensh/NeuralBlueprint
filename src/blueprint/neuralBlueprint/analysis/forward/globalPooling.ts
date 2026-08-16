import type {
  GlobalPoolingNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import { preserveRepetitionStats } from '../repetitionRank';
import { createEmptyDistanceIndexRank } from '../distanceIndexRank';
import { EPS } from './utils/constants';
import {
  getGlobalAggregationSize,
  getKnownDimension,
  globalPoolingTensorShape,
  readTensorShape,
} from './spatial';
import { getForwardPoolingMoments } from './poolingMoments';
import { getDistributionTransitionSaturation } from './utils/math';
import { globalizeSpatialView } from '../spatialView';

export function forwardGlobalPoolingStats(
  node: GlobalPoolingNodeData,
  input: ModuleStats,
): ModuleStats | null {
  const inputShape = readTensorShape(input);
  const aggregationSize = getGlobalAggregationSize(inputShape);
  if (aggregationSize === null) return null;
  const shape = globalPoolingTensorShape(inputShape);
  const rank = getKnownDimension(shape.channels) ?? Number.NaN;
  const moments = aggregationSize === 'unknown'
    ? {
      mean: Number.NaN,
      variance: Number.NaN,
      zeroRate: Number.NaN,
      negativeRate: Number.NaN,
    }
    : getForwardPoolingMoments(input, aggregationSize, node.poolMode);
  const inputEffectiveRank = Number.isFinite(rank)
    ? Math.min(input.rank.effectiveRank, rank)
    : input.rank.effectiveRank;
  const saturation = node.poolMode === 'average'
    ? input.rank.saturation
    : getDistributionTransitionSaturation(input, moments);
  const effectiveRank = node.poolMode === 'average'
    ? inputEffectiveRank
    : rank * saturation;
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
    spatialView: globalizeSpatialView(input.spatialView),
    adaptation: {
      repetition: preserveRepetitionStats(input, effectiveRank),
      distanceIndex: createEmptyDistanceIndexRank(),
    },
  };
}
