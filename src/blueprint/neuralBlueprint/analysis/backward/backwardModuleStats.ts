import type {
  ModuleNodeData,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';
import { backwardDropoutStats } from './dropout';
import { backwardLinearStats } from './linear';
import { backwardReLUStats } from './relu';

export function backwardModuleStats(
  node: ModuleNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  switch (node.kind) {
    case 'Linear':
      return backwardLinearStats(node, gradient);
    case 'ReLU':
      return backwardReLUStats(node, gradient);
    case 'Dropout':
      return backwardDropoutStats(node, gradient);
    default:
      return gradient;
  }
}
