import type {
  ModuleNodeData,
  ModuleStats,
  SumInputPairStats,
} from '../../../ModuleBaseNodeTypes';
import {
  getElementCorrBetweenNodes,
  getLinearCorrBetweenNodes,
} from '../../correlation';

export function flattenSumInputs(
  inputs: ModuleStats[],
  inputNodes: ModuleNodeData[],
  statsByNodeId: Map<string, ModuleStats>,
  visiting = new Set<string>(),
) {
  const flattenedInputs: ModuleStats[] = [];
  const flattenedInputNodes: ModuleNodeData[] = [];

  inputNodes.forEach((inputNode, index) => {
    const input = inputs[index];
    if (
      inputNode.kind !== 'Sum'
      || inputNode.predecessors.length === 0
      || visiting.has(inputNode.id)
    ) {
      if (input) {
        flattenedInputs.push(input);
        flattenedInputNodes.push(inputNode);
      }
      return;
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(inputNode.id);
    const nestedInputNodes: ModuleNodeData[] = [];
    const nestedInputs = inputNode.predecessors
      .map((predecessor) => {
        const predecessorStats = statsByNodeId.get(predecessor.id);
        if (predecessorStats) {
          nestedInputNodes.push(predecessor);
        }
        return predecessorStats;
      })
      .filter((predecessorStats): predecessorStats is ModuleStats => Boolean(predecessorStats));
    const nestedFlattened = flattenSumInputs(
      nestedInputs,
      nestedInputNodes,
      statsByNodeId,
      nextVisiting,
    );

    flattenedInputs.push(...nestedFlattened.inputs);
    flattenedInputNodes.push(...nestedFlattened.inputNodes);
  });

  return {
    inputs: flattenedInputs,
    inputNodes: flattenedInputNodes,
  };
}

export function computeSumCovariance(
  inputs: ModuleStats[],
  inputNodes: ModuleNodeData[],
  nodeMap: Map<string, ModuleNodeData>,
  statsByNodeId: Map<string, ModuleStats>,
) {
  if (inputNodes.length < 2) {
    return {
      total: 0,
      elementPairCorrelation: new Map<string, number>(),
      pairs: [] as SumInputPairStats[],
    };
  }

  const elementPairCorrelation = computeInputPairCorrelation(
    inputNodes,
    nodeMap,
    statsByNodeId,
    getElementCorrBetweenNodes,
  );
  const linearPairCorrelation = computeInputPairCorrelation(
    inputNodes,
    nodeMap,
    statsByNodeId,
    getLinearCorrBetweenNodes,
  );
  const pairs: SumInputPairStats[] = [];
  let total = 0;

  for (let leftIndex = 0; leftIndex < inputNodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < inputNodes.length; rightIndex += 1) {
      const covarianceCorrelation = getInputPairCorrelation(elementPairCorrelation, leftIndex, rightIndex);
      const linearCorrelation = getInputPairCorrelation(linearPairCorrelation, leftIndex, rightIndex);
      const covariance = covarianceCorrelation
        * Math.sqrt(Math.max(inputs[leftIndex].distribution.variance, 0))
        * Math.sqrt(Math.max(inputs[rightIndex].distribution.variance, 0));

      total += 2 * covariance;
      pairs.push({
        leftNodeId: inputNodes[leftIndex].id,
        rightNodeId: inputNodes[rightIndex].id,
        covarianceCorrelation,
        linearCorrelation,
        correlation: covarianceCorrelation,
        covariance,
      });
    }
  }

  return {
    total,
    elementPairCorrelation,
    pairs,
  };
}

export function computeInputPairCorrelation(
  inputNodes: ModuleNodeData[],
  nodeMap: Map<string, ModuleNodeData>,
  statsByNodeId: Map<string, ModuleStats>,
  getCorrelation: (
    nodeAId: string,
    nodeBId: string,
    statsByNodeId: Map<string, ModuleStats>,
    nodeMap: Map<string, ModuleNodeData>,
  ) => number,
) {
  const pairCorrelation = new Map<string, number>();

  for (let leftIndex = 0; leftIndex < inputNodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < inputNodes.length; rightIndex += 1) {
      pairCorrelation.set(
        getInputPairKey(leftIndex, rightIndex),
        getCorrelation(
          inputNodes[leftIndex].id,
          inputNodes[rightIndex].id,
          statsByNodeId,
          nodeMap,
        ),
      );
    }
  }

  return pairCorrelation;
}

export function computeSumInputCorr(
  inputs: ModuleStats[],
  inputNodes: ModuleNodeData[],
  sumVariance: number,
  inputPairCorrelation: Map<string, number>,
) {
  const inputCorr: Record<string, number> = {};

  inputNodes.forEach((inputNode, inputIndex) => {
    const targetVariance = inputs[inputIndex]?.distribution.variance ?? 0;
    if (targetVariance <= 0 || sumVariance <= 0) {
      inputCorr[inputNode.id] = 0;
      return;
    }

    let covarianceWithSum = targetVariance;

    inputs.forEach((input, otherIndex) => {
      if (inputIndex === otherIndex) return;

      covarianceWithSum += getInputPairCorrelation(inputPairCorrelation, inputIndex, otherIndex)
        * Math.sqrt(
          Math.max(targetVariance, 0)
            * Math.max(input.distribution.variance, 0),
        );
    });

    inputCorr[inputNode.id] = covarianceWithSum / Math.sqrt(targetVariance * sumVariance);
  });

  return inputCorr;
}

export function getInputPairCorrelation(
  inputPairCorrelation: Map<string, number>,
  leftIndex: number,
  rightIndex: number,
) {
  return inputPairCorrelation.get(getInputPairKey(leftIndex, rightIndex)) ?? 0;
}

function getInputPairKey(leftIndex: number, rightIndex: number) {
  return leftIndex < rightIndex
    ? `${leftIndex}:${rightIndex}`
    : `${rightIndex}:${leftIndex}`;
}
