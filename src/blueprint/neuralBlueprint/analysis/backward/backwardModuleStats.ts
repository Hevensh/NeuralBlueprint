import type {
  ModuleNodeData,
  ModuleStatsBackwardContext,
  ModuleStatsBackwardResult,
} from '../../ModuleBaseNodeTypes';
import { backwardDropoutStats } from './dropout';
import { backwardIdentityStats } from './identity';
import { backwardLinearStats } from './linear';
import { backwardReLUStats } from './relu';

export function backwardModuleStats(
  context: ModuleStatsBackwardContext,
): ModuleStatsBackwardResult {
  switch (context.node.kind) {
    case 'Linear':
      return backwardLinearStats(withNode(context, context.node));
    case 'ReLU':
      return backwardReLUStats(withNode(context, context.node));
    case 'Dropout':
      return backwardDropoutStats(withNode(context, context.node));
    default:
      return backwardIdentityStats(context);
  }
}

function withNode<TNode extends ModuleNodeData>(
  context: ModuleStatsBackwardContext,
  node: TNode,
): ModuleStatsBackwardContext<TNode> {
  return {
    ...context,
    node,
  };
}
