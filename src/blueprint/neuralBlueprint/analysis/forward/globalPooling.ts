import type {
  GlobalPoolingNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import { preserveRepetitionRank } from '../repetitionRank';
import { EPS } from './utils/constants';
import {
  getGlobalAggregationSize,
  getKnownDimension,
  globalPoolingTensorShape,
  readTensorShape,
} from './spatial';
import { getForwardPoolingMoments } from './poolingMoments';
import { getNonZeroTransitionSaturation } from './utils/math';

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
    ? Math.min(input.effectiveRank, rank)
    : input.effectiveRank;
  const saturation = node.poolMode === 'average'
    ? input.saturation
    : getNonZeroTransitionSaturation(input, moments.zeroRate);
  const effectiveRank = node.poolMode === 'average'
    ? inputEffectiveRank
    : rank * saturation;
  return {
    ...input,
    ...moments,
    rank,
    effectiveRank,
    saturation: Number.isFinite(rank)
      ? effectiveRank / Math.max(rank, EPS)
      : saturation,
    shape,
    repetitionRank: preserveRepetitionRank(input, effectiveRank),
  };
}
