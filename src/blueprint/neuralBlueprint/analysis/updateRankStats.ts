import type {
  ModuleBaseNode,
  ModuleBaseNodeData,
  ModuleRankStats,
  ModuleVarianceStats,
} from '../ModuleBaseNodeTypes';
import { getLinearCorrBetweenNodes } from './correlation';

const LINEAR_SATURATION_GAIN = 1;
const DISTANCE_EPSILON = 1e-12;
const RELU_STANDARD_NORMAL_CORR = 0.853;
const RELU_CORR_GAMMA = Math.log(RELU_STANDARD_NORMAL_CORR) / Math.log(0.5);

export function updateRankStats(nodes: ModuleBaseNode[]): void {
  runRankStats(nodes.map((node) => node.data));
}

export function runRankStats(nodes: ModuleBaseNodeData[]): Map<string, ModuleRankStats> {
  const ranks = new Map<string, ModuleRankStats>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const sortedNodes = [...nodes].sort((left, right) => (
    (left.forwardTopologyOrder ?? 0) - (right.forwardTopologyOrder ?? 0)
  ));

  sortedNodes.forEach((node) => {
    if (node.inCycle) {
      node.rankStats = getEmptyRankStats(node);
      ranks.set(node.id, node.rankStats);
      return;
    }
    if (node.kind !== 'Input' && node.predecessors.length === 0) {
      node.rankStats = getDisconnectedRankStats(node);
      ranks.set(node.id, node.rankStats);
      return;
    }

    const inputNodes = node.predecessors
      .map((predecessor) => nodeMap.get(predecessor.id))
      .filter((inputNode): inputNode is ModuleBaseNodeData => Boolean(inputNode));
    const inputRanks = inputNodes
      .map((inputNode) => ranks.get(inputNode.id) ?? inputNode.rankStats)
      .filter((rank): rank is ModuleRankStats => Boolean(rank));

    const rankStats = inferModuleRankStats(node, inputNodes, inputRanks, nodeMap, ranks);
    node.rankStats = rankStats;
    ranks.set(node.id, rankStats);
    updateSumPairLinearCorrelations(node, ranks, nodeMap);
  });

  return ranks;
}

function inferModuleRankStats(
  node: ModuleBaseNodeData,
  inputNodes: ModuleBaseNodeData[],
  inputRanks: ModuleRankStats[],
  nodeMap: Map<string, ModuleBaseNodeData>,
  ranks: Map<string, ModuleRankStats>,
) {
  if (node.kind === 'Input') {
    return inferInputRank(node);
  }
  if (node.kind === 'Linear') {
    return inferLinearRank(node, inputNodes[0], inputRanks[0]);
  }
  if (node.kind === 'ReLU') {
    return inferReluRank(node, inputNodes[0], inputRanks[0]);
  }
  if (node.kind === 'Sum') {
    return inferSumRank(node, inputNodes, inputRanks, nodeMap, ranks);
  }

  return inputRanks[0] ?? getEmptyRankStats(node);
}

function inferInputRank(node: ModuleBaseNodeData): ModuleRankStats {
  const rank = getOutputRank(node);
  const effectiveRank = node.rankStats?.effectiveRank ?? rank;

  return {
    rank,
    effectiveRank,
    saturation: effectiveRank / Math.max(rank, DISTANCE_EPSILON),
  };
}

function inferLinearRank(
  node: ModuleBaseNodeData,
  inputNode: ModuleBaseNodeData | undefined,
  inputRank: ModuleRankStats | undefined,
): ModuleRankStats {
  const rank = getOutputRank(node);
  const inputEffectiveRank = inputRank?.effectiveRank ?? rank;
  const saturation = 1 - Math.exp((-LINEAR_SATURATION_GAIN * inputEffectiveRank) / Math.max(rank, DISTANCE_EPSILON));
  const inputRankValue = inputRank?.rank ?? rank;

  return {
    rank,
    effectiveRank: rank * saturation,
    saturation,
    inputLinearCorr: inputNode
      ? { [inputNode.id]: getLinearInformationCorr(inputRankValue, rank) }
      : undefined,
  };
}

function inferReluRank(
  node: ModuleBaseNodeData,
  inputNode: ModuleBaseNodeData | undefined,
  inputRank: ModuleRankStats | undefined,
): ModuleRankStats {
  if (!inputRank) {
    return getEmptyRankStats(node);
  }

  const reluRho = getReluSaturationRho(node.predecessors[0]?.varianceStats);
  const saturation = inputRank.saturation ** reluRho;

  return {
    rank: inputRank.rank,
    effectiveRank: inputRank.rank * saturation,
    saturation,
    inputLinearCorr: inputNode
      ? { [inputNode.id]: getReluLinearCorr(node.predecessors[0]?.varianceStats) }
      : undefined,
  };
}

function inferSumRank(
  node: ModuleBaseNodeData,
  inputNodes: ModuleBaseNodeData[],
  inputRanks: ModuleRankStats[],
  nodeMap: Map<string, ModuleBaseNodeData>,
  ranks: Map<string, ModuleRankStats>,
): ModuleRankStats {
  if (inputRanks.length < 2) {
    return inputRanks[0] ?? getEmptyRankStats(node);
  }

  const rank = inputRanks[0].rank;
  if (inputRanks.some((inputRank) => Math.abs(inputRank.rank - rank) > 1e-6)) {
    return node.rankStats ?? getEmptyRankStats(node);
  }

  const correlationSums = inputRanks.map((_, leftIndex) => (
    inputRanks.reduce((sum, __, rightIndex) => {
      if (leftIndex === rightIndex) return sum;
      return sum + getLinearCorrBetweenNodes(
        inputNodes[leftIndex].id,
        inputNodes[rightIndex].id,
        ranks,
        nodeMap,
      );
    }, 0)
  ));
  const effectiveRank = inputRanks.reduce((sum, inputRank, index) => (
    sum + inputRank.effectiveRank / (1 + correlationSums[index])
  ), 0);

  return {
    rank,
    effectiveRank,
    saturation: effectiveRank / Math.max(rank, DISTANCE_EPSILON),
    inputLinearCorr: computeSumInputLinearCorr(inputNodes, inputRanks, ranks, nodeMap),
  };
}

function updateSumPairLinearCorrelations(
  node: ModuleBaseNodeData,
  ranks: Map<string, ModuleRankStats>,
  nodeMap: Map<string, ModuleBaseNodeData>,
) {
  if (node.kind !== 'Sum' || !node.sumInputPairStats) {
    return;
  }

  node.sumInputPairStats = node.sumInputPairStats.map((pair) => ({
    ...pair,
    linearCorrelation: getLinearCorrBetweenNodes(
      pair.leftNodeId,
      pair.rightNodeId,
      ranks,
      nodeMap,
    ),
  }));
}

function computeSumInputLinearCorr(
  inputNodes: ModuleBaseNodeData[],
  inputRanks: ModuleRankStats[],
  ranks: Map<string, ModuleRankStats>,
  nodeMap: Map<string, ModuleBaseNodeData>,
) {
  const inputLinearCorr: Record<string, number> = {};
  const rank = inputRanks[0]?.rank ?? 0;
  const sumRank = computeSumLinearRank(inputNodes, inputRanks, ranks, nodeMap);

  inputNodes.forEach((inputNode, inputIndex) => {
    if (!rank || sumRank <= 0) {
      inputLinearCorr[inputNode.id] = 0;
      return;
    }

    let covarianceWithSum = rank;

    inputNodes.forEach((otherNode, otherIndex) => {
      if (inputIndex === otherIndex) return;

      covarianceWithSum += getLinearCorrBetweenNodes(
        inputNode.id,
        otherNode.id,
        ranks,
        nodeMap,
      ) * Math.sqrt(Math.max(rank, 0) * Math.max(inputRanks[otherIndex]?.rank ?? 0, 0));
    });

    inputLinearCorr[inputNode.id] = clamp01(
      covarianceWithSum / Math.sqrt(rank * Math.max(sumRank, DISTANCE_EPSILON)),
    );
  });

  return inputLinearCorr;
}

function computeSumLinearRank(
  inputNodes: ModuleBaseNodeData[],
  inputRanks: ModuleRankStats[],
  ranks: Map<string, ModuleRankStats>,
  nodeMap: Map<string, ModuleBaseNodeData>,
) {
  let rank = inputRanks.reduce((sum, inputRank) => sum + inputRank.rank, 0);

  for (let leftIndex = 0; leftIndex < inputNodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < inputNodes.length; rightIndex += 1) {
      const correlation = getLinearCorrBetweenNodes(
        inputNodes[leftIndex].id,
        inputNodes[rightIndex].id,
        ranks,
        nodeMap,
      );

      rank += 2
        * correlation
        * Math.sqrt(
          Math.max(inputRanks[leftIndex]?.rank ?? 0, 0)
            * Math.max(inputRanks[rightIndex]?.rank ?? 0, 0),
        );
    }
  }

  return Math.max(rank, 0);
}

function getLinearInformationCorr(dimIn: number, dimOut?: number) {
  if (dimIn <= 0) {
    return 0;
  }
  if (!dimOut || dimOut >= dimIn) {
    return 1;
  }

  return Math.sqrt(dimOut / dimIn);
}

function getReluLinearCorr(inputStats?: ModuleVarianceStats) {
  return getReluCorrByNegativeRate(inputStats?.negativeRate);
}

function getReluCorrByNegativeRate(negativeRateInput: number | undefined) {
  const negativeRate = clamp01(negativeRateInput ?? 0.5);
  const removedMass = smoothstep(negativeRate);
  const preservedMass = clamp01(1 - removedMass);

  return preservedMass === 0
    ? 0
    : Math.pow(preservedMass, RELU_CORR_GAMMA);
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function getReluSaturationRho(inputStats?: ModuleVarianceStats) {
  if (!inputStats) {
    return 0.5;
  }

  const std = Math.sqrt(Math.max(inputStats.variance, 0));
  const negativeRate = inputStats.negativeRate ?? 0.5;
  const positiveRate = 1 - negativeRate;
  const magnitude = Math.abs(inputStats.mean) + std;
  const mPlus = positiveRate * magnitude;
  const mMinus = negativeRate * magnitude;

  if (mPlus + mMinus <= DISTANCE_EPSILON) {
    return 0;
  }

  return mPlus / (mPlus + mMinus);
}

function getOutputRank(node: ModuleBaseNodeData) {
  return Math.max(node.outFeatures ?? node.rankStats?.rank ?? 64, DISTANCE_EPSILON);
}

function getEmptyRankStats(node: ModuleBaseNodeData): ModuleRankStats {
  const rank = getOutputRank(node);

  return {
    rank,
    effectiveRank: 0,
    saturation: 0,
  };
}

function getDisconnectedRankStats(node: ModuleBaseNodeData): ModuleRankStats {
  return {
    rank: getOutputRank(node),
    effectiveRank: Number.NaN,
    saturation: Number.NaN,
  };
}
