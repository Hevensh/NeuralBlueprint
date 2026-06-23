import type {
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { forwardInputStats } from './input';
import { forwardLinearStats } from './linear';
import { forwardReLUStats } from './relu';
import { forwardDropoutStats } from './dropout';
import { aggregateForwardStats } from '../aggregation/forward';

export function forwardModuleStats(
  context: ModuleStatsForwardContext,
): ModuleStatsForwardResult {
  if (context.node.kind === 'Input') {
    return {
      stats: forwardInputStats(context.node),
    };
  }

  const aggregation = aggregateForwardStats(context);
  const input = aggregation.stats;
  const inputNode = context.inputNodes[0];

  switch (context.node.kind) {
    case 'Linear':
      return {
        stats: forwardLinearStats(context.node, input, inputNode),
      };
    case 'ReLU':
      return {
        stats: forwardReLUStats(input, inputNode),
      };
    case 'Dropout':
      return {
        stats: forwardDropoutStats(context.node, input, inputNode),
      };
    case 'Sum':
      return {
        stats: input,
        sumInputPairStats: aggregation.sumInputPairStats,
      };
    default:
      return {
        stats: input,
      };
  }
}
