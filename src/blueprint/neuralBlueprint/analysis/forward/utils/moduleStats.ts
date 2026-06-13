import type { ModuleBaseNodeData, ModuleStats } from '../../../ModuleBaseNodeTypes';
import { DEFAULT_RANK, EMPTY_STATS, EPS } from './constants';

export function getEmptyStats(node: ModuleBaseNodeData): ModuleStats {
  const rank = getOutputRank(node);

  return {
    ...EMPTY_STATS,
    rank,
    effectiveRank: 0,
    saturation: 0,
    minRank: rank,
    mean: 0,
    variance: 0,
    zeroRate: 0,
    negativeRate: 0,
  };
}

export function getDisconnectedStats(node: ModuleBaseNodeData): ModuleStats {
  if (node.kind === 'Sum' || node.kind === 'ReLU' || node.kind === 'Output') {
    return EMPTY_STATS;
  }

  return {
    ...EMPTY_STATS,
    rank: getOutputRank(node),
    minRank: getOutputRank(node),
  };
}

export function getOutputRank(node: ModuleBaseNodeData) {
  return Math.max(node.outFeatures ?? node.stats?.rank ?? DEFAULT_RANK, EPS);
}

export function getFanIn(node: ModuleBaseNodeData) {
  const predecessorDim = node.predecessors.reduce((sum, predecessor) => (
    sum + (predecessor.stats?.rank ?? DEFAULT_RANK)
  ), 0);

  return Math.max(node.inFeatures ?? (predecessorDim || DEFAULT_RANK), 1);
}

export function getWeightVariance(
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

export function getBiasVariance(node: ModuleBaseNodeData) {
  if (node.useBias === false) {
    return 0;
  }

  return node.biasInitializationMode === 'standard_normal' ? 1 : 0;
}

export function getLinearElementCorr(dimIn: number) {
  return dimIn <= 0 ? 0 : 1 / Math.sqrt(dimIn);
}
