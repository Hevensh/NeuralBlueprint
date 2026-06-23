import type {
  ModuleStatsBackward,
  ReLUNodeData,
} from '../../ModuleBaseNodeTypes';
import { applyBackwardGate } from './utils';

export function backwardReLUStats(
  node: ReLUNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  const forwardInput = node.predecessors[0]?.stats;
  const keepRate = 1
    - (forwardInput?.zeroRate ?? 0)
    - (forwardInput?.negativeRate ?? 0.5);

  return applyBackwardGate(gradient, keepRate);
}
