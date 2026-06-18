import type {
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
      return backwardLinearStats(context);
    case 'ReLU':
      return backwardReLUStats(context);
    case 'Dropout':
      return backwardDropoutStats(context);
    default:
      return backwardIdentityStats(context);
  }
}
