import type {
  ModuleNodeData,
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
      return forwardInputStats(withNode(context, context.node));
    case 'Linear':
      return forwardLinearStats(withNode(aggregatedContext, context.node));
    case 'ReLU':
      return forwardReLUStats(withNode(aggregatedContext, context.node));
    case 'Dropout':
      return forwardDropoutStats(withNode(aggregatedContext, context.node));
    case 'Sum':
      return {
        ...forwardSumStats(withNode(aggregatedContext, context.node)),
        sumInputPairStats: aggregation.sumInputPairStats,
      };
    default:
      return {
        stats: aggregation.stats ?? DEFAULT_INPUT_STATS,
      };
  }
}

function withNode<TNode extends ModuleNodeData>(
  context: ModuleStatsForwardContext,
  node: TNode,
): ModuleStatsForwardContext<TNode> {
  return {
    ...context,
    node,
  };
}
