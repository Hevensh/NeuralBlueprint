import type {
  ModuleStatsBackwardContext,
  ModuleStatsBackwardResult,
} from '../../ModuleBaseNodeTypes';
import { applyBackwardGate } from './utils';

export function backwardReLUStats({
  node,
  gradient,
}: ModuleStatsBackwardContext): ModuleStatsBackwardResult {
  const forwardInput = node.predecessors[0]?.stats;
  const keepRate = 1
    - (forwardInput?.zeroRate ?? 0)
    - (forwardInput?.negativeRate ?? 0.5);

  return {
    stats: applyBackwardGate(gradient, keepRate),
  };
}
