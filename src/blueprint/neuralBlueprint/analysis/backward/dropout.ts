import type {
  ModuleStatsBackwardContext,
  ModuleStatsBackwardResult,
} from '../../ModuleBaseNodeTypes';
import { clamp01 } from '../forward/utils/math';
import { applyBackwardGate } from './utils';

export function backwardDropoutStats({
  node,
  gradient,
}: ModuleStatsBackwardContext): ModuleStatsBackwardResult {
  return {
    stats: applyBackwardGate(
      gradient,
      1 - clamp01(node.dropoutRate ?? 0.5),
    ),
  };
}
