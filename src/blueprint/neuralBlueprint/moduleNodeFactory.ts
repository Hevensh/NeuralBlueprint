import type {
  ModuleBaseNodeData,
  ModuleBaseNodeKind,
  ModuleNodeData,
  ModuleStats,
} from './ModuleBaseNodeTypes';

export const DEFAULT_OUTPUT_DIM = 64;
export const DEFAULT_INPUT_EFFECTIVE_RANK = 32;

const moduleNodeKinds: ModuleBaseNodeKind[] = [
  'Input',
  'Linear',
  'ReLU',
  'Dropout',
  'Sum',
  'Output',
];

export function isModuleBaseNodeKind(kind: string): kind is ModuleBaseNodeKind {
  return moduleNodeKinds.includes(kind as ModuleBaseNodeKind);
}

export function createModuleNodeData(
  kind: ModuleBaseNodeKind,
  common: Pick<ModuleBaseNodeData, 'id' | 'name' | 'type' | 'position'>,
): ModuleNodeData {
  const base = {
    ...common,
    kind,
    predecessors: [],
    successors: [],
    forwardTopologyOrder: 0,
    backwardTopologyOrder: 0,
    inCycle: false,
    stats: getDefaultStats(kind),
  };

  switch (kind) {
    case 'Input':
      return {
        ...base,
        kind,
        normalizationMode: '0-1',
        outFeatures: DEFAULT_OUTPUT_DIM,
        inputEffectiveRank: DEFAULT_INPUT_EFFECTIVE_RANK,
      };
    case 'Linear':
      return {
        ...base,
        kind,
        initializationMode: 'xavier_normal',
        biasInitializationMode: 'zeros',
        outFeatures: DEFAULT_OUTPUT_DIM,
        useBias: true,
      };
    case 'Dropout':
      return {
        ...base,
        kind,
        dropoutRate: 0.5,
      };
    case 'ReLU':
    case 'Sum':
      return {
        ...base,
        kind,
      };
    case 'Output':
      return {
        ...base,
        kind,
        neededOutputDim: DEFAULT_OUTPUT_DIM,
      };
  }
}

function getDefaultStats(kind: ModuleBaseNodeKind): ModuleStats {
  if (kind === 'Input') {
    return {
      rank: DEFAULT_OUTPUT_DIM,
      dimLabel: 'normal',
      effectiveRank: DEFAULT_INPUT_EFFECTIVE_RANK,
      saturation: DEFAULT_INPUT_EFFECTIVE_RANK / DEFAULT_OUTPUT_DIM,
      minRank: DEFAULT_OUTPUT_DIM,
      mean: 0.5,
      variance: 1 / 12,
      zeroRate: 0,
      negativeRate: 0,
    };
  }

  if (kind === 'Linear') {
    return {
      rank: DEFAULT_OUTPUT_DIM,
      dimLabel: 'normal',
      effectiveRank: Number.NaN,
      saturation: Number.NaN,
      minRank: Number.NaN,
      mean: Number.NaN,
      variance: Number.NaN,
      zeroRate: Number.NaN,
      negativeRate: Number.NaN,
    };
  }

  return {
    rank: Number.NaN,
    dimLabel: 'normal',
    effectiveRank: Number.NaN,
    saturation: Number.NaN,
    minRank: Number.NaN,
    mean: Number.NaN,
    variance: Number.NaN,
    zeroRate: Number.NaN,
    negativeRate: Number.NaN,
  };
}
