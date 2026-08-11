import type {
  ModuleStats,
  PoolingNodeData,
} from '../../ModuleBaseNodeTypes';
import { poolRepetitionRank } from '../repetitionRank';
import { getForwardPoolingMoments } from './poolingMoments';
import {
  getKnownDimension,
  inferSpatialOutputShape,
  readTensorShape,
} from './spatial';
import { EPS } from './utils/constants';
import { getNonZeroTransitionSaturation } from './utils/math';

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
    ? input.saturation
    : getNonZeroTransitionSaturation(input, moments.zeroRate);
  const effectiveRank = node.poolMode === 'average'
    ? input.effectiveRank
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
    repetitionRank: poolRepetitionRank(
      input,
      node.kernelSize,
      effectiveRank,
    ),
  };
}
