import type { ModuleStatsBackward } from '../../ModuleBaseNodeTypes';

export function boundBackwardStats(
  stats: ModuleStatsBackward,
): ModuleStatsBackward {
  const outputRank = stats.rank.outputRank;
  const effectiveRank = stats.rank.effectiveRank;
  if (!Number.isFinite(outputRank) || !Number.isFinite(effectiveRank)) {
    return stats;
  }

  const rankLimit = Math.max(outputRank, 0);
  const boundedEffectiveRank = Math.min(
    Math.max(effectiveRank, 0),
    rankLimit,
  );
  const minRank = stats.rank.minRank;
  return {
    ...stats,
    rank: {
      ...stats.rank,
      outputRank: rankLimit,
      effectiveRank: boundedEffectiveRank,
      saturation: rankLimit > 0
        ? boundedEffectiveRank / rankLimit
        : 0,
      minRank: Number.isFinite(minRank)
        ? Math.min(Math.max(minRank as number, 0), rankLimit)
        : minRank,
    },
  };
}
