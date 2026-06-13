import type {
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { DEFAULT_INPUT_EFFECTIVE_RANK, EPS } from './utils/constants';
import { getOutputRank } from './utils/moduleStats';

export function forwardInputStats({
  node,
}: ModuleStatsForwardContext): ModuleStatsForwardResult {
  const rank = getOutputRank(node);
  const effectiveRank = node.stats?.effectiveRank
    ?? DEFAULT_INPUT_EFFECTIVE_RANK;
  const inputDistribution = node.normalizationMode === 'standard'
    ? {
      mean: 0,
      variance: 1,
      zeroRate: 0,
      negativeRate: 0.5,
    }
    : {
      mean: 0.5,
      variance: 1 / 12,
      zeroRate: 0,
      negativeRate: 0,
    };

  return {
    stats: {
      rank,
      effectiveRank,
      saturation: effectiveRank / Math.max(rank, EPS),
      ...inputDistribution,
    },
  };
}
