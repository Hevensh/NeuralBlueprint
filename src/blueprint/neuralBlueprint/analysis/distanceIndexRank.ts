import type { DistanceIndexRank } from '../ModuleBaseNodeTypes';

export const EMPTY_DISTANCE_INDEX_RANK: DistanceIndexRank = {
  none: 0,
  short: 0,
  medium: 0,
  long: 0,
  global: 0,
};

export function createEmptyDistanceIndexRank(): DistanceIndexRank {
  return { ...EMPTY_DISTANCE_INDEX_RANK };
}
