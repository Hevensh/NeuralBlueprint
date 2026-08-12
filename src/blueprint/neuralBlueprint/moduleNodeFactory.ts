import type {
  ModuleBaseNodeData,
  ModuleBaseNodeKind,
  ModuleNodeData,
  ModuleStats,
} from './ModuleBaseNodeTypes';
import { createEmptyRepetitionStats } from './analysis/repetitionRank';
import { createEmptyDistanceIndexRank } from './analysis/distanceIndexRank';
export { isModuleBaseNodeKind } from './moduleRegistry';

export const DEFAULT_OUTPUT_DIM = 64;
export const DEFAULT_INPUT_EFFECTIVE_RANK = 32;
export const DEFAULT_3D_INPUT_CHANNELS = 3;
export const DEFAULT_3D_INPUT_SIZE = 224;

export function createModuleNodeData(
  kind: ModuleBaseNodeKind,
  common: Pick<ModuleBaseNodeData, 'id' | 'name' | 'type'>,
): ModuleNodeData {
  const base = {
    ...common,
    kind,
    links: { predecessorIds: [], successorIds: [] },
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
    case '3DInput':
      return {
        ...base,
        kind,
        normalizationMode: '0-1',
        outFeatures: DEFAULT_3D_INPUT_CHANNELS,
        inputEffectiveRank: DEFAULT_3D_INPUT_CHANNELS,
        height: DEFAULT_3D_INPUT_SIZE,
        width: DEFAULT_3D_INPUT_SIZE,
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
    case 'CNN':
      return {
        ...base,
        kind,
        initializationMode: 'xavier_normal',
        biasInitializationMode: 'zeros',
        outFeatures: 32,
        kernelSize: 3,
        stride: 1,
        padding: 1,
        dilation: 1,
        useBias: true,
      };
    case 'Pooling':
      return {
        ...base,
        kind,
        poolMode: 'max',
        kernelSize: 2,
        stride: 2,
        padding: 0,
      };
    case 'GlobalPooling':
      return {
        ...base,
        kind,
        poolMode: 'average',
      };
    case 'Dropout':
      return {
        ...base,
        kind,
        dropoutRate: 0.5,
      };
    case 'ReLU':
    case 'Sum':
    case 'Flatten':
      return {
        ...base,
        kind,
      };
    case 'Output':
      return {
        ...base,
        kind,
        neededOutputDim: DEFAULT_OUTPUT_DIM,
        neededTime: 'absent',
        neededHeight: 'absent',
        neededWidth: 'absent',
      };
  }
}

function getDefaultStats(kind: ModuleBaseNodeKind): ModuleStats {
  if (kind === 'Input' || kind === '3DInput') {
    const rank = kind === '3DInput'
      ? DEFAULT_3D_INPUT_CHANNELS
      : DEFAULT_OUTPUT_DIM;
    const effectiveRank = kind === '3DInput'
      ? DEFAULT_3D_INPUT_CHANNELS
      : DEFAULT_INPUT_EFFECTIVE_RANK;
    return {
      status: 'valid',
      rank: {
        outputRank: rank,
        basisRank: rank,
        effectiveRank,
        saturation: effectiveRank / rank,
        minRank: rank,
      },
      distribution: {
        mean: 0.5,
        variance: 1 / 12,
        zeroRate: 0,
        negativeRate: 0,
      },
      shape: {
        time: 'absent',
        channels: rank,
        height: kind === '3DInput' ? DEFAULT_3D_INPUT_SIZE : 'absent',
        width: kind === '3DInput' ? DEFAULT_3D_INPUT_SIZE : 'absent',
      },
      adaptation: {
        repetition: createEmptyRepetitionStats(),
        distanceIndex: createEmptyDistanceIndexRank(),
      },
    };
  }

  if (kind === 'Linear' || kind === 'CNN') {
    const rank = kind === 'CNN' ? 32 : DEFAULT_OUTPUT_DIM;
    return {
      status: 'unknown',
      rank: {
        outputRank: rank,
        basisRank: Number.NaN,
        effectiveRank: Number.NaN,
        saturation: Number.NaN,
        minRank: Number.NaN,
      },
      distribution: {
        mean: Number.NaN,
        variance: Number.NaN,
        zeroRate: Number.NaN,
        negativeRate: Number.NaN,
      },
      shape: {
        time: 'absent',
        channels: rank,
        height: kind === 'CNN' ? 'unknown' : 'absent',
        width: kind === 'CNN' ? 'unknown' : 'absent',
      },
      adaptation: {
        repetition: createEmptyRepetitionStats(),
        distanceIndex: createEmptyDistanceIndexRank(),
      },
    };
  }

  return {
    status: 'unknown',
    rank: {
      outputRank: Number.NaN,
      basisRank: Number.NaN,
      effectiveRank: Number.NaN,
      saturation: Number.NaN,
      minRank: Number.NaN,
    },
    distribution: {
      mean: Number.NaN,
      variance: Number.NaN,
      zeroRate: Number.NaN,
      negativeRate: Number.NaN,
    },
    shape: {
      time: 'absent',
      channels: 'unknown',
      height: kind === 'Pooling' ? 'unknown' : 'absent',
      width: kind === 'Pooling' ? 'unknown' : 'absent',
    },
    adaptation: {
      repetition: createEmptyRepetitionStats(),
      distanceIndex: createEmptyDistanceIndexRank(),
    },
  };
}
