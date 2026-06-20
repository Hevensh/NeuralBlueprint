import type {
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
  SumNodeData,
} from '../../ModuleBaseNodeTypes';
import { DEFAULT_INPUT_STATS } from './utils/constants';

export function forwardSumStats({
  inputs,
}: ModuleStatsForwardContext<SumNodeData>): ModuleStatsForwardResult {
  return {
    stats: inputs[0] ?? DEFAULT_INPUT_STATS,
  };
}
