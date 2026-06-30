import type {
  BackwardOutputPairStats,
  ModuleNodeData,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';
import { EPS } from '../forward/utils/constants';
import { estimateSumNegativeRate, isNonNegative } from '../forward/utils/math';

export function aggregateBackwardStats(
  gradients: ModuleStatsBackward[],
  outputNodes: ModuleNodeData[],
  pairs: BackwardOutputPairStats[],
): ModuleStatsBackward {
  if (gradients.length === 1) {
    return gradients[0];
  }

  const rank = gradients.reduce(
    (maxRank, gradient) => Math.max(maxRank, gradient.rank),
    0,
  );
  const effectiveRank = computeAggregatedEffectiveRank(
    gradients,
    outputNodes,
    pairs,
  );
  const minRank = computeAggregatedMinRank(gradients, outputNodes, pairs);
  const mean = gradients.reduce((sum, gradient) => sum + gradient.mean, 0);
  const variance = gradients.reduce(
    (sum, gradient) => sum + gradient.variance,
    pairs.reduce((sum, pair) => sum + 2 * pair.covariance, 0),
  );
  const allNonNegative = gradients.every(isNonNegative);

  return {
    rank,
    effectiveRank,
    saturation: effectiveRank / Math.max(rank, EPS),
    minRank,
    mean,
    variance,
    zeroRate: allNonNegative
      ? gradients.reduce(
        (product, gradient) => product * gradient.zeroRate,
        1,
      )
      : 0,
    negativeRate: allNonNegative
      ? 0
      : estimateSumNegativeRate(mean, variance),
  };
}

function computeAggregatedEffectiveRank(
  gradients: ModuleStatsBackward[],
  outputNodes: ModuleNodeData[],
  pairs: BackwardOutputPairStats[],
) {
  const pairCorrelation = createPairCorrelationMap(pairs);
  return gradients.reduce((sum, gradient, leftIndex) => {
    const gradientStd = Math.sqrt(Math.max(gradient.variance, 0));
    if (gradientStd <= 0) return sum;

    const correlatedStd = gradients.reduce((
      stdSum,
      otherGradient,
      rightIndex,
    ) => {
      if (leftIndex === rightIndex) return stdSum;

      return stdSum
        + readPairCorrelation(
          pairCorrelation,
          outputNodes[leftIndex]?.id,
          outputNodes[rightIndex]?.id,
        ) * Math.sqrt(Math.max(otherGradient.variance, 0));
    }, gradientStd);

    return sum + gradient.effectiveRank * gradientStd / Math.max(
      correlatedStd,
      EPS,
    );
  }, 0);
}

function computeAggregatedMinRank(
  gradients: ModuleStatsBackward[],
  outputNodes: ModuleNodeData[],
  pairs: BackwardOutputPairStats[],
) {
  const pairCorrelation = createPairCorrelationMap(pairs);
  let minRank = gradients.reduce(
    (sum, gradient) => sum + (gradient.minRank ?? gradient.rank),
    0,
  );

  for (let leftIndex = 0; leftIndex < gradients.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < gradients.length;
      rightIndex += 1
    ) {
      const leftMinRank = gradients[leftIndex].minRank
        ?? gradients[leftIndex].rank;
      const rightMinRank = gradients[rightIndex].minRank
        ?? gradients[rightIndex].rank;
      minRank -= readPairCorrelation(
        pairCorrelation,
        outputNodes[leftIndex]?.id,
        outputNodes[rightIndex]?.id,
      ) * Math.min(leftMinRank, rightMinRank);
    }
  }

  return Math.max(minRank, 0);
}

function createPairCorrelationMap(pairs: BackwardOutputPairStats[]) {
  return new Map(pairs.map((pair) => [
    getPairKey(pair.leftNodeId, pair.rightNodeId),
    pair.linearCorrelation,
  ]));
}

function readPairCorrelation(
  pairCorrelation: Map<string, number>,
  leftNodeId: string | undefined,
  rightNodeId: string | undefined,
) {
  if (!leftNodeId || !rightNodeId) return 0;
  return pairCorrelation.get(getPairKey(leftNodeId, rightNodeId)) ?? 0;
}

function getPairKey(leftNodeId: string, rightNodeId: string) {
  return leftNodeId < rightNodeId
    ? `${leftNodeId}:${rightNodeId}`
    : `${rightNodeId}:${leftNodeId}`;
}
