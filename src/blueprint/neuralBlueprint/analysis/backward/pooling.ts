import type {
  GlobalPoolingNodeData,
  ModuleStatsBackward,
  PoolingNodeData,
  PoolMode,
} from '../../ModuleBaseNodeTypes';
import { EPS } from '../forward/utils/constants';
import {
  clamp01,
  negativeRateFromNormal,
} from '../forward/utils/math';
import {
  getGlobalAggregationSize,
  readTensorShape,
} from '../forward/spatial';
import { applyBackwardGate } from './utils';

export function backwardPoolingStats(
  node: PoolingNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  const kernelSize = Math.max(1, Math.round(node.kernelSize));
  const stride = Math.max(1, Math.round(node.stride));
  const elementCount = kernelSize ** 2;
  const overlapCount = Math.max(1, (kernelSize / stride) ** 2);

  const result = backwardAggregateStats(
    gradient,
    elementCount,
    overlapCount,
    node.poolMode,
  );
  if (node.poolMode === 'average') return result;
  return copyEffectiveRank(
    result,
    applyBackwardGate(
      gradient,
      getMaxBackwardKeepRate(node, elementCount, overlapCount),
    ),
  );
}

export function backwardGlobalPoolingStats(
  node: GlobalPoolingNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  const input = node.predecessors[0]?.stats;
  if (!input) return unknownMoments(gradient);

  const elementCount = getGlobalAggregationSize(readTensorShape(input));
  if (elementCount === null) return gradient;
  if (elementCount === 'unknown') return unknownMoments(gradient);

  const result = backwardAggregateStats(
    gradient,
    elementCount,
    1,
    node.poolMode,
  );
  if (node.poolMode === 'average') return result;
  return copyEffectiveRank(
    result,
    applyBackwardGate(
      gradient,
      getMaxBackwardKeepRate(node, elementCount, 1),
    ),
  );
}

function getMaxBackwardKeepRate(
  node: PoolingNodeData | GlobalPoolingNodeData,
  elementCount: number,
  overlapCount: number,
) {
  const input = node.predecessors[0]?.stats;
  const output = node.stats;
  let perWindowRate = 1 / Math.max(1, elementCount);

  if (
    input
    && output
    && (input.distribution.negativeRate ?? 0) <= EPS
  ) {
    const inputNonZeroRate = clamp01(
      1 - input.distribution.zeroRate,
    );
    const outputNonZeroRate = clamp01(
      1 - output.distribution.zeroRate,
    );
    perWindowRate = inputNonZeroRate <= EPS
      ? 0
      : clamp01(
        outputNonZeroRate
          / (Math.max(1, elementCount) * inputNonZeroRate),
      );
  }

  return 1 - Math.pow(1 - perWindowRate, overlapCount);
}

function copyEffectiveRank(
  stats: ModuleStatsBackward,
  rankStats: ModuleStatsBackward,
): ModuleStatsBackward {
  return {
    ...stats,
    rank: rankStats.rank,
  };
}

function backwardAggregateStats(
  gradient: ModuleStatsBackward,
  elementCountInput: number,
  overlapCount: number,
  mode: PoolMode,
): ModuleStatsBackward {
  const elementCount = Math.max(1, Math.round(elementCountInput));
  if (elementCount === 1 && overlapCount === 1) return gradient;

  if (mode === 'average') {
    const mean = overlapCount
      * gradient.distribution.mean / elementCount;
    const variance = overlapCount
      * gradient.distribution.variance / elementCount ** 2;
    const zeroRate = Math.pow(
      gradient.distribution.zeroRate,
      overlapCount,
    );
    return {
      ...gradient,
      distribution: {
        mean,
        variance,
        zeroRate,
        negativeRate: (1 - zeroRate)
          * negativeRateFromNormal(mean, variance),
      },
    };
  }

  const selectionRate = 1 / elementCount;
  const oneMean = selectionRate * gradient.distribution.mean;
  const oneSecondMoment = selectionRate
    * (
      gradient.distribution.variance
        + gradient.distribution.mean ** 2
    );
  const mean = overlapCount * oneMean;
  const variance = overlapCount * Math.max(
    oneSecondMoment - oneMean ** 2,
    0,
  );
  const oneZeroRate = 1 - selectionRate * (
    1 - gradient.distribution.zeroRate
  );
  const zeroRate = Math.pow(oneZeroRate, overlapCount);

  return {
    ...gradient,
    distribution: {
      mean,
      variance,
      zeroRate,
      negativeRate: (1 - zeroRate)
        * negativeRateFromNormal(mean, variance),
    },
  };
}

function unknownMoments(
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  return {
    ...gradient,
    distribution: {
      mean: Number.NaN,
      variance: Number.NaN,
      zeroRate: Number.NaN,
      negativeRate: Number.NaN,
    },
  };
}
