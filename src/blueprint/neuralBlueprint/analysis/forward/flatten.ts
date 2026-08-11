import type { ModuleStats } from '../../ModuleBaseNodeTypes';
import { preserveRepetitionRank } from '../repetitionRank';
import { EPS } from './utils/constants';
import {
  flattenTensorShape,
  getKnownDimension,
  readTensorShape,
} from './spatial';

export function forwardFlattenStats(input: ModuleStats): ModuleStats {
  const shape = flattenTensorShape(readTensorShape(input));
  const rank = getKnownDimension(shape.channels) ?? Number.NaN;
  const effectiveRank = input.effectiveRank;
  return {
    ...input,
    rank,
    minRank: Number.isFinite(input.minRank) && Number.isFinite(rank)
      ? Math.min(input.minRank as number, rank)
      : input.minRank,
    saturation: Number.isFinite(rank)
      ? effectiveRank / Math.max(rank, EPS)
      : Number.NaN,
    shape,
    repetitionRank: preserveRepetitionRank(input, effectiveRank),
  };
}
