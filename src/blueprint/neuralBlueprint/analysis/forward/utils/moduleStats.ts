import type {
  BiasInitializationMode,
  LinearNodeData,
  ModuleDimLabel,
  ModuleNodeData,
  ModuleStats,
} from '../../../ModuleBaseNodeTypes';
import { DEFAULT_RANK, EMPTY_STATS } from './constants';

export function getEmptyStats(node: ModuleNodeData): ModuleStats {
  const retainedRank = getRetainedRank(node);
  const rank = Number.isFinite(retainedRank)
    ? retainedRank
    : DEFAULT_RANK;

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

export function getDisconnectedStats(node: ModuleNodeData): ModuleStats {
  if (
    node.kind === 'Sum'
    || node.kind === 'ReLU'
    || node.kind === 'Dropout'
    || node.kind === 'Output'
    || node.kind === 'Pooling'
    || node.kind === 'Flatten'
    || node.kind === 'GlobalPooling'
  ) {
    return EMPTY_STATS;
  }

  return {
    ...EMPTY_STATS,
    rank: node.outFeatures,
    minRank: node.outFeatures,
  };
}

export function getInvalidInferenceStats(
  node: ModuleNodeData,
  dimLabel: Exclude<ModuleDimLabel, 'normal'>,
): ModuleStats {
  const retainedRank = getRetainedRank(node);

  return {
    ...EMPTY_STATS,
    rank: retainedRank,
    minRank: retainedRank,
    dimLabel,
  };
}

export function getFanIn(
  node: LinearNodeData,
  input?: Pick<ModuleStats, 'rank'>,
) {
  if (
    input
    && !Number.isFinite(input.rank)
    && node.inFeatures === undefined
  ) return Number.NaN;
  const inferredRank = input?.rank ?? node.predecessors.reduce(
    (sum, predecessor) => sum + (predecessor.stats?.rank ?? DEFAULT_RANK),
    0,
  );

  return Math.max(
    node.inFeatures
      ?? (Number.isFinite(inferredRank) ? inferredRank as number : DEFAULT_RANK),
    1,
  );
}

function getRetainedRank(node: ModuleNodeData) {
  const rank = node.kind === 'Output'
    ? node.neededOutputDim
    : (
        node.kind === 'Input' || node.kind === '3DInput' || node.kind === 'Linear' || node.kind === 'CNN'
      )
        ? node.outFeatures
        : node.stats?.rank;
  return Number.isFinite(rank) ? rank as number : Number.NaN;
}

export function getWeightVariance(
  mode: LinearNodeData['initializationMode'],
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

export function getBiasVariance(node: {
  useBias: boolean;
  biasInitializationMode: BiasInitializationMode;
}) {
  if (!node.useBias) {
    return 0;
  }

  return node.biasInitializationMode === 'standard_normal' ? 1 : 0;
}

export function getLinearElementCorr(dimIn: number) {
  return dimIn <= 0 ? 0 : 1 / Math.sqrt(dimIn);
}
