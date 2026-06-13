import type {
  ModuleStats,
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { forwardInputStats } from './input';
import { forwardLinearStats } from './linear';
import { forwardReLUStats } from './relu';
import { forwardSumStats } from './sum';
import { DEFAULT_INPUT_STATS } from './utils/constants';

export function forwardModuleStats(
  context: ModuleStatsForwardContext,
): ModuleStatsForwardResult {
  switch (context.node.kind) {
    case 'Input':
      return forwardInputStats(context);
    case 'Linear':
      return forwardLinearStats(context);
    case 'ReLU':
      return forwardReLUStats(context);
    case 'Sum':
      return forwardSumStats(context);
    default:
      return {
        stats: stripDimLabel(context.inputs[0] ?? DEFAULT_INPUT_STATS),
      };
  }
}

function stripDimLabel(stats: ModuleStats): ModuleStats {
  const nextStats = { ...stats };
  delete nextStats.dimLabel;
  return nextStats;
}
