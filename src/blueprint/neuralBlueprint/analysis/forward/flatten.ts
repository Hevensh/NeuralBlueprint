import type { ModuleStats } from '../../ModuleBaseNodeTypes';
import { preserveRepetitionStats } from '../repetitionRank';
import { EPS } from './utils/constants';
import {
  flattenTensorShape,
  getKnownDimension,
  readTensorShape,
} from './spatial';

export function forwardFlattenStats(input: ModuleStats): ModuleStats {
  const shape = flattenTensorShape(readTensorShape(input));
  const rank = getKnownDimension(shape.channels) ?? Number.NaN;
  const effectiveRank = input.rank.effectiveRank;
  return {
    ...input,
    rank: {
      outputRank: rank,
      basisRank: rank,
      effectiveRank,
      minRank: Number.isFinite(input.rank.minRank) && Number.isFinite(rank)
        ? Math.min(input.rank.minRank as number, rank)
        : input.rank.minRank,
      saturation: Number.isFinite(rank)
        ? effectiveRank / Math.max(rank, EPS)
        : Number.NaN,
    },
    shape,
    adaptation: {
      repetition: preserveRepetitionStats(input, effectiveRank),
    },
  };
}
