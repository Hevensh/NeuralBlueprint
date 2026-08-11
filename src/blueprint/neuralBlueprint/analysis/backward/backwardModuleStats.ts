import type {
  ModuleNodeData,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';
import { backwardDropoutStats } from './dropout';
import { backwardLinearStats } from './linear';
import { backwardReLUStats } from './relu';
import { backwardCNNStats } from './cnn';
import {
  backwardGlobalPoolingStats,
  backwardPoolingStats,
} from './pooling';

export function backwardModuleStats(
  node: ModuleNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  switch (node.kind) {
    case 'Linear':
      return backwardLinearStats(node, gradient);
    case 'CNN':
      return backwardCNNStats(node, gradient);
    case 'Pooling':
      return backwardPoolingStats(node, gradient);
    case 'ReLU':
      return backwardReLUStats(node, gradient);
    case 'Dropout':
      return backwardDropoutStats(node, gradient);
    case 'Flatten':
      return restoreInputChannelRank(node, gradient);
    case 'GlobalPooling':
      return restoreInputChannelRank(
        node,
        backwardGlobalPoolingStats(node, gradient),
      );
    default:
      return gradient;
  }
}

function restoreInputChannelRank(
  node: ModuleNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  const inputRank = node.predecessors[0]?.stats?.rank.outputRank;
  if (!Number.isFinite(inputRank)) return gradient;
  const rank = inputRank as number;
  const effectiveRank = Math.min(gradient.rank.effectiveRank, rank);
  return {
    ...gradient,
    rank: {
      outputRank: rank,
      basisRank: rank,
      effectiveRank,
      saturation: rank > 0 ? effectiveRank / rank : 0,
      minRank: Math.min(
        gradient.rank.minRank ?? gradient.rank.outputRank,
        rank,
      ),
    },
  };
}
