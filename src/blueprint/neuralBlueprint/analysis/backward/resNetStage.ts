import type {
  ModuleStatsBackward,
  ResNetInternalConvAnalysis,
  ResNetStageNodeData,
} from '../../ModuleBaseNodeTypes';
import { applyBackwardGate } from './utils';
import { EPS, LINEAR_SATURATION_GAIN } from '../forward/utils/constants';
import { negativeRateFromNormal } from '../forward/utils/math';
import { getWeightVariance } from '../forward/utils/moduleStats';
import { backwardNormalizationStats } from './normalization';

export function backwardResNetStageStats(
  node: ResNetStageNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  let current = gradient;
  const internals = node.internalConvs ?? [];
  const blockCount = Math.max(1, Math.round(node.blockCount));

  for (let blockIndex = blockCount - 1; blockIndex >= 0; blockIndex -= 1) {
    const blockConvs = internals.filter((item) => item.blockIndex === blockIndex);
    const conv1 = blockConvs.find((item) => item.branch === 'main' && item.id.endsWith(':1'));
    const conv2 = blockConvs.find((item) => item.branch === 'main' && item.id.endsWith(':2'));
    const projection = blockConvs.find((item) => item.branch === 'projection');
    if (!conv1 || !conv2) continue;

    const gatedOutput = applyBackwardGate(current, 0.5);
    const afterConv2 = backwardInternalConv(node, conv2, gatedOutput);
    const afterInnerRelu = applyBackwardGate(afterConv2, 0.5);
    const mainInput = backwardInternalConv(node, conv1, afterInnerRelu);
    const skipInput = projection
      ? backwardInternalConv(node, projection, gatedOutput)
      : resizeIdentityGradient(gatedOutput, conv1.inputChannels);
    current = mergeResidualGradients(mainInput, skipInput, conv1.inputChannels);
  }

  node.internalConvs = internals;
  return current;
}

function backwardInternalConv(
  node: ResNetStageNodeData,
  internal: ResNetInternalConvAnalysis,
  gradient: ModuleStatsBackward,
) {
  const inputChannels = Math.max(1, internal.inputChannels);
  const kernelArea = Math.max(1, internal.kernelSize ** 2);
  const fanIn = inputChannels * kernelArea;
  const fanOut = Math.max(1, internal.outputChannels * kernelArea);
  const effectiveRank = inputChannels * (
    1 - Math.exp(
      (-LINEAR_SATURATION_GAIN * gradient.rank.effectiveRank)
        / Math.max(inputChannels, EPS),
    )
  );
  const weightVariance = getWeightVariance(
    node.initializationMode,
    fanIn,
    fanOut,
  );
  const mean = 0;
  const rawVariance = fanOut * weightVariance * (
    gradient.distribution.variance + gradient.distribution.mean ** 2
  );
  // The gradient crosses the block's BatchNorm before the convolution.
  const variance = rawVariance;
  const result: ModuleStatsBackward = {
    rank: {
      outputRank: inputChannels,
      basisRank: inputChannels,
      effectiveRank,
      saturation: effectiveRank / inputChannels,
      minRank: Math.min(
        gradient.rank.minRank ?? gradient.rank.outputRank,
        inputChannels,
      ),
    },
    distribution: {
      mean,
      variance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(mean, variance),
    },
  };
  const normalized = backwardNormalizationStats(result);
  internal.statsBackward = normalized;
  internal.memoryPoint = internal.stats.rank.effectiveRank * normalized.rank.effectiveRank;
  return normalized;
}

function resizeIdentityGradient(
  gradient: ModuleStatsBackward,
  outputRank: number,
): ModuleStatsBackward {
  const effectiveRank = Math.min(outputRank, gradient.rank.effectiveRank);
  return {
    ...gradient,
    rank: {
      ...gradient.rank,
      outputRank,
      basisRank: outputRank,
      effectiveRank,
      saturation: outputRank > 0 ? effectiveRank / outputRank : 0,
      minRank: Math.min(
        gradient.rank.minRank ?? gradient.rank.outputRank,
        outputRank,
      ),
    },
  };
}

function mergeResidualGradients(
  main: ModuleStatsBackward,
  skip: ModuleStatsBackward,
  outputRank: number,
): ModuleStatsBackward {
  const majorRank = Math.max(main.rank.effectiveRank, skip.rank.effectiveRank);
  const minorRank = Math.min(main.rank.effectiveRank, skip.rank.effectiveRank);
  const effectiveRank = Math.min(outputRank, majorRank + 0.25 * minorRank);
  return {
    rank: {
      outputRank,
      basisRank: outputRank,
      effectiveRank,
      saturation: outputRank > 0 ? effectiveRank / outputRank : 0,
      minRank: Math.max(
        main.rank.minRank ?? main.rank.outputRank,
        skip.rank.minRank ?? skip.rank.outputRank,
      ),
    },
    distribution: {
      mean: main.distribution.mean + skip.distribution.mean,
      variance: main.distribution.variance + skip.distribution.variance,
      zeroRate: main.distribution.zeroRate * skip.distribution.zeroRate,
      negativeRate: 0.5,
    },
  };
}
