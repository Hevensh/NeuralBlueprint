import type {
  ModuleStats,
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { forwardInputStats } from './input';
import { forwardLinearStats } from './linear';
import { forwardReLUStats } from './relu';
import { forwardDropoutStats } from './dropout';
import { forwardSumStats } from './sum';
import { DEFAULT_INPUT_STATS } from './utils/constants';
import { aggregateForwardStats } from '../aggregation/forward';

export function forwardModuleStats(
  context: ModuleStatsForwardContext,
): ModuleStatsForwardResult {
  const aggregation = aggregateForwardStats(context);
  const aggregatedContext = {
    ...context,
    inputs: [aggregation.stats],
  };

  switch (context.node.kind) {
    case 'Input':
      return forwardInputStats(context);
    case 'Linear':
      return forwardLinearStats(aggregatedContext);
    case 'ReLU':
      return forwardReLUStats(aggregatedContext);
    case 'Dropout':
      return forwardDropoutStats(aggregatedContext);
    case 'Sum':
      return {
        ...forwardSumStats(aggregatedContext),
        sumInputPairStats: aggregation.sumInputPairStats,
      };
    default:
      return {
        stats: stripDimLabel(aggregation.stats ?? DEFAULT_INPUT_STATS),
      };
  }
}

function stripDimLabel(stats: ModuleStats): ModuleStats {
  const nextStats = { ...stats };
  delete nextStats.dimLabel;
  return nextStats;
}
