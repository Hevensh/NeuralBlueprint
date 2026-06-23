import type {
  DropoutNodeData,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';
import { clamp01 } from '../forward/utils/math';
import { applyBackwardGate } from './utils';

export function backwardDropoutStats(
  node: DropoutNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  return applyBackwardGate(
    gradient,
    1 - clamp01(node.dropoutRate),
  );
}
