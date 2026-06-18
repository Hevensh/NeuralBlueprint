import type {
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { DEFAULT_INPUT_STATS } from './utils/constants';

export function forwardSumStats({
  inputs,
}: ModuleStatsForwardContext): ModuleStatsForwardResult {
  return {
    stats: inputs[0] ?? DEFAULT_INPUT_STATS,
  };
}
