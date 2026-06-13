import type {
  ModuleBaseNode,
  ModuleBaseNodeData,
  ModuleForwardContext,
  ModuleForwardResult,
  ModuleVarianceStats,
  SumInputPairStats,
} from '../ModuleBaseNodeTypes';
import {
  getElementCorrBetweenNodes,
} from './correlation';

const DEFAULT_INPUT_STAT: ModuleVarianceStats = {
  mean: 0,
  variance: 1,
  zeroRate: 0,
  negativeRate: 0.5,
};

const EMPTY_STAT: ModuleVarianceStats = {
  mean: Number.NaN,
  variance: Number.NaN,
  zeroRate: Number.NaN,
  negativeRate: Number.NaN,
};

const EPS = 1e-8;
const RELU_STANDARD_NORMAL_CORR = 0.853;
const RELU_CORR_GAMMA = Math.log(RELU_STANDARD_NORMAL_CORR) / Math.log(0.5);

export function updateVarianceStats(nodes: ModuleBaseNode[]): void {
  runForwardStats(nodes.map((node) => node.data));
}

export function runForwardStats(
  nodes: ModuleBaseNodeData[],
): Map<string, ModuleVarianceStats> {
  const stats = new Map<string, ModuleVarianceStats>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const sortedNodes = [...nodes].sort((left, right) => (
    (left.forwardTopologyOrder ?? 0) - (right.forwardTopologyOrder ?? 0)
  ));

  sortedNodes.forEach((node) => {
    if (node.inCycle) {
      const stat = getEmptyVarianceStats();
      node.forward = forwardModule;
      node.varianceStats = stat;
      stats.set(node.id, stat);
      return;
    }
    if (node.kind !== 'Input' && node.predecessors.length === 0) {
      node.forward = forwardModule;
      node.varianceStats = EMPTY_STAT;
      node.sumInputPairStats = undefined;
      stats.set(node.id, EMPTY_STAT);
      return;
    }

    const inputNodes: ModuleBaseNodeData[] = [];
    const inputs = node.predecessors
      .map((predecessor) => {
        const inputNode = nodeMap.get(predecessor.id);
        const stat = stats.get(predecessor.id);
        if (inputNode && stat) {
          inputNodes.push(inputNode);
        }
        return stat;
      })
      .filter((stat): stat is ModuleVarianceStats => Boolean(stat));
    const forward = node.forward ?? forwardModule;
    const result = forward({
      node,
      inputs,
      inputNodes,
      nodeMap,
      statsByNodeId: stats,
    });

    node.forward = forward;
    node.varianceStats = result.stat;
    stats.set(node.id, result.stat);
  });

  return stats;
}

export function forwardModule(context: ModuleForwardContext): ModuleForwardResult {
  switch (context.node.kind) {
    case 'Input':
      return forwardInput(context);
    case 'Linear':
      return forwardLinear(context);
    case 'ReLU':
      return forwardReLU(context);
    case 'Sum':
      return forwardSum(context);
    default:
      return {
        stat: context.inputs[0] ?? DEFAULT_INPUT_STAT,
        message: 'unsupported module type',
      };
  }
}

export function forwardInput({
  node,
}: ModuleForwardContext): ModuleForwardResult {
  if (node.normalizationMode === 'standard') {
    return {
      stat: {
        mean: 0,
        variance: 1,
        zeroRate: 0,
        negativeRate: 0.5,
      },
    };
  }

  return {
    stat: {
      mean: 0.5,
      variance: 1 / 12,
      zeroRate: 0,
      negativeRate: 0,
    },
  };
}

export function forwardLinear({
  node,
  inputs,
  inputNodes,
}: ModuleForwardContext): ModuleForwardResult {
  const input = inputs[0] ?? EMPTY_STAT;
  const inputNodeId = inputNodes?.[0]?.id;
  const fanIn = getFanIn(node);
  const fanOut = getFanOut(node);
  const weightVariance = getWeightVariance(
    node.initializationMode,
    fanIn,
    fanOut,
  );
  const biasVariance = getBiasVariance(node);
  const secondMoment = input.variance + input.mean ** 2;
  const outputMean = 0;
  const outputVariance = fanIn * weightVariance * secondMoment + biasVariance;

  return {
    stat: {
      mean: outputMean,
      variance: outputVariance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(outputMean, outputVariance),
      inputElementCorr: inputNodeId
        ? { [inputNodeId]: getLinearElementCorr(fanIn) }
        : undefined,
    },
  };
}

export function forwardReLU({
  inputs,
  inputNodes,
}: ModuleForwardContext): ModuleForwardResult {
  const input = inputs[0] ?? EMPTY_STAT;
  const inputNodeId = inputNodes?.[0]?.id;
  if (isNonNegative(input)) {
    return {
      stat: {
        ...input,
        negativeRate: 0,
        inputElementCorr: inputNodeId ? { [inputNodeId]: 1 } : undefined,
      },
    };
  }

  const std = Math.sqrt(Math.max(input.variance, 0) + EPS);
  const alpha = input.mean / std;
  const phi = normalPdf(alpha);
  const Phi = normalCdf(alpha);
  const meanY = std * phi + input.mean * Phi;
  const secondMomentY = (input.mean ** 2 + input.variance) * Phi + input.mean * std * phi;
  const varianceY = secondMomentY - meanY ** 2;

  return {
    stat: {
      mean: meanY,
      variance: Math.max(varianceY, 0),
      zeroRate: clamp01(
        input.zeroRate
          + (input.negativeRate ?? negativeRateFromNormal(input.mean, input.variance)),
      ),
      negativeRate: 0,
      inputElementCorr: inputNodeId
        ? { [inputNodeId]: getReluElementCorr(input) }
        : undefined,
    },
  };
}

export function forwardSum({
  node,
  inputs,
  inputNodes,
  nodeMap,
  statsByNodeId,
}: ModuleForwardContext): ModuleForwardResult {
  const flattenedInputs = flattenSumInputs(
    inputs,
    inputNodes ?? [],
    statsByNodeId,
  );
  const validInputs = flattenedInputs.inputs.length > 0
    ? flattenedInputs.inputs
    : [DEFAULT_INPUT_STAT];
  const validInputNodes = flattenedInputs.inputNodes;
  const mean = validInputs.reduce((sum, input) => sum + input.mean, 0);
  const independentVariance = validInputs.reduce((sum, input) => sum + input.variance, 0);
  const covariance = computeSumCovariance(
    validInputs,
    validInputNodes,
    nodeMap,
    statsByNodeId,
  );
  node.sumInputPairStats = covariance.pairs;
  const variance = Math.max(independentVariance + covariance.total, 0);
  const allNonNegative = validInputs.every(isNonNegative);
  const zeroRate = allNonNegative
    ? validInputs.reduce((product, input) => product * input.zeroRate, 1)
    : 0;
  const inputElementCorr = computeSumInputElementCorr(
    validInputs,
    validInputNodes,
    variance,
    covariance.elementPairCorrelation,
  );
  return {
    stat: {
      mean,
      variance,
      zeroRate: clamp01(zeroRate),
      negativeRate: allNonNegative ? 0 : estimateSumNegativeRate(mean, variance),
      inputElementCorr,
    },
  };
}

function estimateSumNegativeRate(
  mean: number,
  variance: number,
) {
  const std = Math.sqrt(Math.max(variance, EPS));
  return clamp01(1 / (1 + Math.exp((2 * mean) / std)));
}

function flattenSumInputs(
  inputs: ModuleVarianceStats[],
  inputNodes: ModuleBaseNodeData[],
  statsByNodeId?: Map<string, ModuleVarianceStats>,
  visiting = new Set<string>(),
) {
  if (!statsByNodeId) {
    return { inputs, inputNodes };
  }

  const flattenedInputs: ModuleVarianceStats[] = [];
  const flattenedInputNodes: ModuleBaseNodeData[] = [];

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
    const nestedInputNodes: ModuleBaseNodeData[] = [];
    const nestedInputs = inputNode.predecessors
      .map((predecessor) => {
        const stat = statsByNodeId.get(predecessor.id);
        if (stat) {
          nestedInputNodes.push(predecessor);
        }
        return stat;
      })
      .filter((stat): stat is ModuleVarianceStats => Boolean(stat));
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

function computeSumCovariance(
  inputs: ModuleVarianceStats[],
  inputNodes: ModuleBaseNodeData[],
  nodeMap?: Map<string, ModuleBaseNodeData>,
  statsByNodeId?: Map<string, ModuleVarianceStats>,
) {
  if (!nodeMap || !statsByNodeId || inputNodes.length < 2) {
    return {
      total: 0,
      pairs: [],
      elementPairCorrelation: new Map<string, number>(),
    };
  }

  const pairs: SumInputPairStats[] = [];
  const elementPairCorrelation = new Map<string, number>();
  let total = 0;

  for (let leftIndex = 0; leftIndex < inputNodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < inputNodes.length; rightIndex += 1) {
      const leftStat = inputs[leftIndex];
      const rightStat = inputs[rightIndex];
      const covarianceCorrelation = getElementCorrBetweenNodes(
        inputNodes[leftIndex].id,
        inputNodes[rightIndex].id,
        statsByNodeId,
        nodeMap,
      );
      const covariance = covarianceCorrelation
        * Math.sqrt(Math.max(leftStat.variance, 0))
        * Math.sqrt(Math.max(rightStat.variance, 0));
      total += 2 * covariance;
      elementPairCorrelation.set(
        getInputPairKey(leftIndex, rightIndex),
        covarianceCorrelation,
      );

      pairs.push({
        leftNodeId: inputNodes[leftIndex].id,
        rightNodeId: inputNodes[rightIndex].id,
        covarianceCorrelation,
        linearCorrelation: 0,
        correlation: covarianceCorrelation,
        covariance,
      });
    }
  }

  return {
    total,
    pairs,
    elementPairCorrelation,
  };
}

function computeSumInputElementCorr(
  inputs: ModuleVarianceStats[],
  inputNodes: ModuleBaseNodeData[],
  sumVariance: number,
  inputPairCorrelation: Map<string, number>,
) {
  const inputElementCorr: Record<string, number> = {};

  inputNodes.forEach((inputNode, inputIndex) => {
    const targetVariance = inputs[inputIndex]?.variance ?? 0;
    if (targetVariance <= 0 || sumVariance <= 0) {
      inputElementCorr[inputNode.id] = 0;
      return;
    }

    let covarianceWithSum = targetVariance;

    inputs.forEach((input, otherIndex) => {
      if (inputIndex === otherIndex) return;

      const correlation = getInputPairCorrelation(
        inputPairCorrelation,
        inputIndex,
        otherIndex,
      );
      covarianceWithSum += correlation
        * Math.sqrt(Math.max(targetVariance, 0) * Math.max(input.variance, 0));
    });

    inputElementCorr[inputNode.id] = clamp01(
      covarianceWithSum / Math.sqrt(targetVariance * sumVariance),
    );
  });

  return inputElementCorr;
}

function getInputPairCorrelation(
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

function isNonNegative(stats: ModuleVarianceStats) {
  return (stats.negativeRate ?? 0) <= 0;
}

function getReluElementCorr(input: ModuleVarianceStats) {
  return getReluCorrByNegativeRate(input.negativeRate);
}

function getReluCorrByNegativeRate(negativeRateInput: number | undefined) {
  const negativeRate = clamp01(negativeRateInput ?? 0.5);
  const removedMass = smoothstep(negativeRate);
  const preservedMass = clamp01(1 - removedMass);

  return preservedMass === 0
    ? 0
    : Math.pow(preservedMass, RELU_CORR_GAMMA);
}

function getLinearElementCorr(dimIn: number) {
  if (dimIn <= 0) {
    return 0;
  }

  return 1 / Math.sqrt(dimIn);
}

export function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

export function erf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

export function normalPdf(value: number) {
  return Math.exp(-0.5 * value ** 2) / Math.sqrt(2 * Math.PI);
}

export function normalCdf(value: number) {
  return 0.5 * (1 + erf(value / Math.SQRT2));
}

export function negativeRateFromNormal(
  mean: number,
  variance: number,
) {
  const std = Math.sqrt(Math.max(variance, 0) + EPS);
  return clamp01(normalCdf(-mean / std));
}

function getFanIn(node: ModuleBaseNodeData) {
  const predecessorDim = node.predecessors.reduce((sum, predecessor) => (
    sum + (predecessor.rankStats?.rank ?? 64)
  ), 0);
  const fanIn = node.inFeatures ?? (predecessorDim || 64);

  return Math.max(fanIn, 1);
}

function getFanOut(node: ModuleBaseNodeData) {
  return Math.max(node.outFeatures ?? node.rankStats?.rank ?? 64, 1);
}

function getWeightVariance(
  mode: ModuleBaseNodeData['initializationMode'],
  fanIn: number,
  fanOut: number,
) {
  if (mode === 'xavier_normal') {
    return 2 / (fanIn + fanOut);
  }
  if (mode === 'standard_normal') {
    return 1;
  }
  return 1 / fanIn;
}

function getBiasVariance(node: ModuleBaseNodeData) {
  if (node.useBias === false) {
    return 0;
  }
  return node.biasInitializationMode === 'standard_normal'
    ? 1
    : 0;
}

function getEmptyVarianceStats(): ModuleVarianceStats {
  return {
    mean: 0,
    variance: 0,
    zeroRate: 0,
    negativeRate: 0,
  };
}
