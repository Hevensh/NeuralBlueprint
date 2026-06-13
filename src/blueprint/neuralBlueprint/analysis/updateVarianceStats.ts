import type {
  BiasInitializationMode,
  LinearInitializationMode,
  ModuleBaseNode,
  ModuleBaseNodeData,
  ModuleVarianceStats,
} from '../ModuleBaseNodeTypes';

export function updateVarianceStats(nodes: ModuleBaseNode[]): void {
  nodes
    .map((node) => node.data)
    .sort((left, right) => (left.forwardTopologyOrder ?? 0) - (right.forwardTopologyOrder ?? 0))
    .forEach((node) => {
      node.forward = () => getForwardVarianceStats(node);
      node.varianceStats = node.forward(undefined) as ModuleVarianceStats;
    });
}

function getForwardVarianceStats(node: ModuleBaseNodeData): ModuleVarianceStats {
  if (node.kind === 'Input') {
    return getInputVarianceStats(node);
  }
  if (node.kind === 'Linear') {
    return getLinearVarianceStats(node);
  }
  if (node.kind === 'ReLU') {
    return getReluVarianceStats(getMergedPredecessorStats(node));
  }
  if (node.kind === 'Sum') {
    return getSummedPredecessorStats(node);
  }
  return getMergedPredecessorStats(node);
}

function getInputVarianceStats(node: ModuleBaseNodeData): ModuleVarianceStats {
  if (node.normalizationMode === 'standard') {
    return {
      mean: 0,
      variance: 1,
      zeroRate: 0,
    };
  }

  return {
    mean: 0.5,
    variance: 1 / 12,
    zeroRate: 0,
  };
}

function getLinearVarianceStats(node: ModuleBaseNodeData): ModuleVarianceStats {
  const inputStats = getMergedPredecessorStats(node);
  const inputDim = Math.max(getInputDim(node), 1);
  const outputDim = Math.max(node.rankStats?.rank ?? 64, 1);
  const weightVariance = getInitializationVariance(
    node.initializationMode ?? 'normal',
    inputDim,
    outputDim,
  );
  const biasStats = getBiasVarianceStats(
    node.biasInitializationMode ?? 'zeros',
    inputDim,
    outputDim,
  );

  return {
    mean: biasStats.mean,
    variance: inputDim * inputStats.variance * weightVariance + biasStats.variance,
    zeroRate: 0,
  };
}

function getReluVarianceStats(inputStats: ModuleVarianceStats): ModuleVarianceStats {
  const inputStd = Math.sqrt(Math.max(inputStats.variance, 0));

  return {
    mean: inputStd / Math.sqrt(2 * Math.PI),
    variance: inputStats.variance * (0.5 - 1 / (2 * Math.PI)),
    zeroRate: 0.5,
    negativeRate: 0.5,
  };
}

function getMergedPredecessorStats(node: ModuleBaseNodeData): ModuleVarianceStats {
  if (node.predecessors.length === 0) {
    return {
      mean: 0,
      variance: 0,
      zeroRate: 0,
    };
  }

  const stats = node.predecessors.map((predecessor) => predecessor.varianceStats ?? getForwardVarianceStats(predecessor));

  return {
    mean: stats.reduce((sum, stat) => sum + stat.mean, 0) / stats.length,
    variance: stats.reduce((sum, stat) => sum + stat.variance, 0) / stats.length,
    zeroRate: stats.reduce((sum, stat) => sum + stat.zeroRate, 0) / stats.length,
    negativeRate: stats.some((stat) => stat.negativeRate !== undefined)
      ? stats.reduce((sum, stat) => sum + (stat.negativeRate ?? 0), 0) / stats.length
      : undefined,
  };
}

function getSummedPredecessorStats(node: ModuleBaseNodeData): ModuleVarianceStats {
  if (node.predecessors.length === 0) {
    return {
      mean: 0,
      variance: 0,
      zeroRate: 0,
    };
  }

  const stats = node.predecessors.map((predecessor) => predecessor.varianceStats ?? getForwardVarianceStats(predecessor));

  return {
    mean: stats.reduce((sum, stat) => sum + stat.mean, 0),
    variance: stats.reduce((sum, stat) => sum + stat.variance, 0),
    zeroRate: stats.reduce((sum, stat) => sum + stat.zeroRate, 0) / stats.length,
    negativeRate: stats.some((stat) => stat.negativeRate !== undefined)
      ? stats.reduce((sum, stat) => sum + (stat.negativeRate ?? 0), 0) / stats.length
      : undefined,
  };
}

function getInitializationVariance(
  mode: LinearInitializationMode,
  inputDim: number,
  outputDim: number,
) {
  return mode === 'xavier'
    ? 2 / (inputDim + outputDim)
    : 1;
}

function getBiasVarianceStats(
  mode: BiasInitializationMode,
  inputDim: number,
  outputDim: number,
): ModuleVarianceStats {
  if (mode === 'zeros') {
    return {
      mean: 0,
      variance: 0,
      zeroRate: 1,
    };
  }

  return {
    mean: 0,
    variance: getInitializationVariance(mode, inputDim, outputDim),
    zeroRate: 0,
  };
}

function getInputDim(node: ModuleBaseNodeData) {
  return node.predecessors.reduce((sum, predecessor) => (
    sum + (predecessor.rankStats?.rank ?? 64)
  ), 0);
}
