import type {
  ModuleNodeData,
  ModuleStats,
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { getLinearCorrBetweenNodes } from '../correlation';
import { maxRepetitionStats } from '../repetitionRank';
import {
  mergeTensorShapes,
  readTensorShape,
  sameTensorShape,
} from '../forward/spatial';
import { DEFAULT_INPUT_STATS, EPS } from '../forward/utils/constants';
import { estimateSumNegativeRate, isNonNegative } from '../forward/utils/math';
import {
  getEmptyStats,
  getInvalidInferenceStats,
} from '../forward/utils/moduleStats';
import {
  computeInputPairCorrelation,
  computeSumCovariance,
  computeSumInputCorr,
  flattenSumInputs,
  getInputPairCorrelation,
} from '../forward/utils/sum';

export function aggregateForwardStats(
  context: ModuleStatsForwardContext,
): ModuleStatsForwardResult {
  if (context.node.kind !== 'Sum') {
    return {
      stats: context.inputs[0] ?? DEFAULT_INPUT_STATS,
    };
  }

  return aggregateForwardSumStats(context);
}

function aggregateForwardSumStats({
  node,
  inputs,
  inputNodes,
  nodeMap,
  statsByNodeId,
}: ModuleStatsForwardContext): ModuleStatsForwardResult {
  const flattened = flattenSumInputs(inputs, inputNodes, statsByNodeId);
  const validInputs = flattened.inputs.length > 0
    ? flattened.inputs
    : [DEFAULT_INPUT_STATS];
  const validInputNodes = flattened.inputNodes;

  if (!hasSameInputShape(validInputs)) {
    return {
      stats: getInvalidInferenceStats(node, 'shape-mismatch'),
    };
  }

  const mean = validInputs.reduce(
    (sum, input) => sum + input.distribution.mean,
    0,
  );
  const covariance = computeSumCovariance(
    validInputs,
    validInputNodes,
    nodeMap,
    statsByNodeId,
  );
  const variance = Math.max(
    validInputs.reduce(
      (sum, input) => sum + input.distribution.variance,
      0,
    )
      + covariance.total,
    0,
  );
  const allNonNegative = validInputs.every(isNonNegative);
  const sumRankState = computeSumRankStats(
    node,
    validInputs,
    validInputNodes,
    nodeMap,
    statsByNodeId,
  );

  return {
    stats: {
      ...sumRankState,
      status: 'valid',
      shape: mergeTensorShapes(validInputs.map(readTensorShape)),
      adaptation: {
        repetition: maxRepetitionStats(
          validInputs,
          sumRankState.rank.effectiveRank,
        ),
      },
      distribution: {
        mean,
        variance,
        zeroRate: allNonNegative
          ? validInputs.reduce(
            (product, input) => (
              product * input.distribution.zeroRate
            ),
            1,
          )
          : 0,
        negativeRate: allNonNegative
          ? 0
          : estimateSumNegativeRate(mean, variance),
      },
      inputElementCorr: computeSumInputCorr(
        validInputs,
        validInputNodes,
        variance,
        covariance.elementPairCorrelation,
      ),
      inputLinearCorr: sumRankState.inputLinearCorr,
    },
    sumInputPairStats: covariance.pairs,
  };
}

function hasSameInputShape(inputs: ModuleStats[]) {
  if (inputs.length < 2) {
    return true;
  }

  const firstShape = readTensorShape(inputs[0]);
  return inputs.every((input) => (
    sameTensorShape(readTensorShape(input), firstShape)
  ));
}

function computeSumRankStats(
  node: ModuleNodeData,
  inputs: ModuleStats[],
  inputNodes: ModuleNodeData[],
  nodeMap: Map<string, ModuleNodeData>,
  statsByNodeId: Map<string, ModuleStats>,
) {
  if (inputs.length < 2) {
    const input = inputs[0] ?? getEmptyStats(node);
    return {
      ...input,
      inputLinearCorr: inputNodes[0]
        ? { [inputNodes[0].id]: 1 }
        : input.inputLinearCorr,
    };
  }

  const rank = inputs.reduce(
    (maxRank, input) => Math.max(maxRank, input.rank.outputRank),
    0,
  );
  const linearPairCorrelation = computeInputPairCorrelation(
    inputNodes,
    nodeMap,
    statsByNodeId,
    getLinearCorrBetweenNodes,
  );
  const effectiveRank = computeSumEffectiveRankByEvidence(
    inputs,
    linearPairCorrelation,
  );
  const minRank = computeSumMinRank(inputs, linearPairCorrelation);

  return {
    rank: {
      outputRank: rank,
      basisRank: rank,
      effectiveRank,
      saturation: effectiveRank / Math.max(rank, EPS),
      minRank,
    },
    inputLinearCorr: computeSumInputLinearCorr(
      inputs,
      inputNodes,
      minRank,
    ),
  };
}

function computeSumEffectiveRankByEvidence(
  inputs: ModuleStats[],
  inputPairCorrelation: Map<string, number>,
) {
  return inputs.reduce((sum, input, leftIndex) => {
    const inputStd = Math.sqrt(input.distribution.variance);
    if (inputStd <= 0) return sum;

    const correlatedStd = inputs.reduce((stdSum, otherInput, rightIndex) => {
      if (leftIndex === rightIndex) return stdSum;

      return stdSum
        + getInputPairCorrelation(
          inputPairCorrelation,
          leftIndex,
          rightIndex,
        ) * Math.sqrt(otherInput.distribution.variance);
    }, inputStd);

    return sum + (
      input.rank.effectiveRank * inputStd
    ) / correlatedStd;
  }, 0);
}

function computeSumMinRank(
  inputs: ModuleStats[],
  inputPairCorrelation: Map<string, number>,
) {
  let minRank = inputs.reduce(
    (sum, input) => sum + (
      input.rank.minRank ?? input.rank.outputRank
    ),
    0,
  );

  for (let leftIndex = 0; leftIndex < inputs.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < inputs.length;
      rightIndex += 1
    ) {
      const leftMinRank = inputs[leftIndex].rank.minRank
        ?? inputs[leftIndex].rank.outputRank;
      const rightMinRank = inputs[rightIndex].rank.minRank
        ?? inputs[rightIndex].rank.outputRank;
      minRank -= getInputPairCorrelation(
        inputPairCorrelation,
        leftIndex,
        rightIndex,
      ) * Math.min(leftMinRank, rightMinRank);
    }
  }

  return Math.max(minRank, 0);
}

function computeSumInputLinearCorr(
  inputs: ModuleStats[],
  inputNodes: ModuleNodeData[],
  sumMinRank: number,
) {
  const inputLinearCorr: Record<string, number> = {};

  inputNodes.forEach((inputNode, inputIndex) => {
    const inputMinRank = inputs[inputIndex]?.rank.minRank
      ?? inputs[inputIndex]?.rank.outputRank
      ?? 0;
    inputLinearCorr[inputNode.id] = inputMinRank > 0 && sumMinRank > 0
      ? Math.sqrt(inputMinRank / sumMinRank)
      : 0;
  });

  return inputLinearCorr;
}
