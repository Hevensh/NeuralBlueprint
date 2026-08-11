import type {
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
  OutputNodeData,
} from '../../ModuleBaseNodeTypes';
import { forwardInputStats } from './input';
import { forwardLinearStats } from './linear';
import { forwardReLUStats } from './relu';
import { forwardDropoutStats } from './dropout';
import { forwardCNNStats } from './cnn';
import { forwardPoolingStats } from './pool';
import { readTensorShape, sameTensorShape } from './spatial';
import { forwardFlattenStats } from './flatten';
import { forwardGlobalPoolingStats } from './globalPooling';
import { aggregateForwardStats } from '../aggregation/forward';
import { getInvalidInferenceStats } from './utils/moduleStats';

export function forwardModuleStats(
  context: ModuleStatsForwardContext,
): ModuleStatsForwardResult {
  if (context.node.kind === 'Input' || context.node.kind === '3DInput') {
    return {
      stats: forwardInputStats(context.node),
    };
  }

  const aggregation = aggregateForwardStats(context);
  const input = aggregation.stats;
  const inputNode = context.inputNodes[0];

  switch (context.node.kind) {
    case 'Linear':
      return {
        stats: forwardLinearStats(context.node, input, inputNode),
      };
    case 'CNN': {
      const stats = forwardCNNStats(context.node, input);
      return {
        stats: stats ?? getInvalidInferenceStats(
          context.node,
          'shape-mismatch',
        ),
      };
    }
    case 'Pooling': {
      const stats = forwardPoolingStats(context.node, input);
      return {
        stats: stats ?? getInvalidInferenceStats(
          context.node,
          'shape-mismatch',
        ),
      };
    }
    case 'Flatten':
      return {
        stats: forwardFlattenStats(input),
      };
    case 'GlobalPooling': {
      const stats = forwardGlobalPoolingStats(context.node, input);
      return {
        stats: stats ?? getInvalidInferenceStats(
          context.node,
          'shape-mismatch',
        ),
      };
    }
    case 'ReLU':
      return {
        stats: forwardReLUStats(input, inputNode),
      };
    case 'Dropout':
      return {
        stats: forwardDropoutStats(context.node, input, inputNode),
      };
    case 'Sum':
      return {
        stats: input,
        sumInputPairStats: aggregation.sumInputPairStats,
      };
    case 'Output':
      return {
        stats: forwardOutputStats(context.node, input),
      };
    default:
      return {
        stats: input,
      };
  }
}

function forwardOutputStats(
  node: OutputNodeData,
  input: ModuleStatsForwardResult['stats'],
) {
  const neededOutputDim = Math.round(node.neededOutputDim);
  const neededShape = {
    time: node.neededTime,
    channels: neededOutputDim,
    height: node.neededHeight,
    width: node.neededWidth,
  };

  if (!sameTensorShape(readTensorShape(input), neededShape)) {
    return getInvalidInferenceStats(node, 'shape-mismatch');
  }

  return input;
}
