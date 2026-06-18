import type {
  ModuleStatsBackwardContext,
  ModuleStatsBackwardResult,
} from '../../ModuleBaseNodeTypes';

export function backwardIdentityStats({
  gradient,
}: ModuleStatsBackwardContext): ModuleStatsBackwardResult {
  return {
    stats: gradient,
  };
}
