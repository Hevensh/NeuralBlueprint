import type {
  ModuleBaseNodeData,
  ModuleStats,
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { getLinearCorrBetweenNodes } from '../correlation';
import { DEFAULT_INPUT_STATS, EPS } from './utils/constants';
import { estimateSumNegativeRate, isNonNegative } from './utils/math';
import { getEmptyStats } from './utils/moduleStats';
import {
  computeInputPairCorrelation,
  computeSumCovariance,
  computeSumInputCorr,
  getInputPairCorrelation,
  flattenSumInputs,
} from './utils/sum';

export function forwardSumStats({
  node,
  inputs,
  inputNodes,
  nodeMap,
  statsByNodeId,
}: ModuleStatsForwardContext): ModuleStatsForwardResult {
  const flattened = flattenSumInputs(inputs, inputNodes, statsByNodeId);
  const validInputs = flattened.inputs.length > 0 ? flattened.inputs : [DEFAULT_INPUT_STATS];
  const validInputNodes = flattened.inputNodes;

  if (!hasSameInputRank(validInputs)) {
    return {
      stats: getInvalidSumStats(),
    };
  }

  const mean = validInputs.reduce((sum, input) => sum + input.mean, 0);
  const covariance = computeSumCovariance(validInputs, validInputNodes, nodeMap, statsByNodeId);
  const variance = Math.max(
    validInputs.reduce((sum, input) => sum + input.variance, 0) + covariance.total,
    0,
  );
  const allNonNegative = validInputs.every(isNonNegative);
  const sumRankState = computeSumRankStats(node, validInputs, validInputNodes, nodeMap, statsByNodeId);

  return {
    stats: {
      ...sumRankState,
      mean,
      variance,
      zeroRate: allNonNegative
        ? validInputs.reduce((product, input) => product * input.zeroRate, 1)
        : 0,
      negativeRate: allNonNegative ? 0 : estimateSumNegativeRate(mean, variance),
      inputElementCorr: computeSumInputCorr(validInputs, validInputNodes, variance, covariance.elementPairCorrelation),
      inputLinearCorr: sumRankState.inputLinearCorr,
    },
    sumInputPairStats: covariance.pairs,
  };
}

function hasSameInputRank(inputs: ModuleStats[]) {
  if (inputs.some((input) => !Number.isFinite(input.rank))) {
    return false;
  }

  if (inputs.length < 2) {
    return true;
  }

  return inputs.every((input) => input.rank === inputs[0].rank);
}

function getInvalidSumStats(): ModuleStats {
  return {
    rank: Number.NaN,
    dimLabel: 'not the same',
    effectiveRank: Number.NaN,
    saturation: Number.NaN,
    minRank: Number.NaN,
    mean: Number.NaN,
    variance: Number.NaN,
    zeroRate: Number.NaN,
    negativeRate: Number.NaN,
  };
}

function computeSumRankStats(
  node: ModuleBaseNodeData,
  inputs: ModuleStats[],
  inputNodes: ModuleBaseNodeData[],
  nodeMap: Map<string, ModuleBaseNodeData>,
  statsByNodeId: Map<string, ModuleStats>,
) {
  if (inputs.length < 2) {
    const input = inputs[0] ?? getEmptyStats(node);
    return {
      ...input,
      inputLinearCorr: inputNodes[0] ? { [inputNodes[0].id]: 1 } : input.inputLinearCorr,
    };
  }

  const rank = inputs.reduce((maxRank, input) => Math.max(maxRank, input.rank), 0);
  const linearPairCorrelation = computeInputPairCorrelation(
    inputNodes,
    nodeMap,
    statsByNodeId,
    getLinearCorrBetweenNodes,
  );
  const effectiveRank = computeSumEffectiveRankByEvidence(inputs, linearPairCorrelation);
  const minRank = computeSumMinRank(inputs, linearPairCorrelation);

  return {
    rank,
    effectiveRank,
    saturation: effectiveRank / Math.max(rank, EPS),
    minRank,
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
    const inputStd = Math.sqrt(input.variance);
    if (inputStd <= 0) return sum;

    const correlatedStd = inputs.reduce((stdSum, otherInput, rightIndex) => {
      if (leftIndex === rightIndex) return stdSum;

      return stdSum + getInputPairCorrelation(inputPairCorrelation, leftIndex, rightIndex)
        * Math.sqrt(otherInput.variance);
    }, inputStd);

    return sum + (input.effectiveRank * inputStd) / correlatedStd;
  }, 0);
}

function computeSumMinRank(
  inputs: ModuleStats[],
  inputPairCorrelation: Map<string, number>,
) {
  let minRank = inputs.reduce((sum, input) => sum + (input.minRank ?? input.rank), 0);

  for (let leftIndex = 0; leftIndex < inputs.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < inputs.length; rightIndex += 1) {
      const leftMinRank = inputs[leftIndex].minRank ?? inputs[leftIndex].rank;
      const rightMinRank = inputs[rightIndex].minRank ?? inputs[rightIndex].rank;
      minRank -= getInputPairCorrelation(inputPairCorrelation, leftIndex, rightIndex)
        * Math.min(leftMinRank, rightMinRank);
    }
  }

  return Math.max(minRank, 0);
}

function computeSumInputLinearCorr(
  inputs: ModuleStats[],
  inputNodes: ModuleBaseNodeData[],
  sumMinRank: number,
) {
  const inputLinearCorr: Record<string, number> = {};

  inputNodes.forEach((inputNode, inputIndex) => {
    const inputMinRank = inputs[inputIndex]?.minRank ?? inputs[inputIndex]?.rank ?? 0;
    inputLinearCorr[inputNode.id] = inputMinRank > 0 && sumMinRank > 0
      ? Math.sqrt(inputMinRank / sumMinRank)
      : 0;
  });

  return inputLinearCorr;
}
