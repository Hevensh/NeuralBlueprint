import type {
  InputNodeData,
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { EPS } from './utils/constants';

export function forwardInputStats({
  node,
}: ModuleStatsForwardContext<InputNodeData>): ModuleStatsForwardResult {
  const rank = node.outFeatures;
  const effectiveRank = node.inputEffectiveRank;
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
      dimLabel: 'normal',
      effectiveRank,
      saturation: effectiveRank / Math.max(rank, EPS),
      ...inputDistribution,
    },
  };
}
