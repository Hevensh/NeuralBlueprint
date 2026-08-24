import type {
  ModuleBaseNodeData,
  ModuleBaseNodeKind,
  ModuleNodeData,
  ModuleStats,
} from './ModuleBaseNodeTypes';
import { createEmptyRepetitionStats } from './analysis/repetitionRank';
import { createEmptyDistanceIndexRank } from './analysis/distanceIndexRank';
import { createSpatialViewFromShape } from './analysis/spatialView';
import type { ModulePalettePreset } from './moduleRegistry';
export { isModuleBaseNodeKind } from './moduleRegistry';

export const DEFAULT_OUTPUT_DIM = 64;
export const DEFAULT_INPUT_EFFECTIVE_RANK = 32;
export const DEFAULT_3D_INPUT_CHANNELS = 3;
export const DEFAULT_3D_INPUT_SIZE = 224;
export const DEFAULT_PRETRAINED_DEPENDENCY_MEMORY_POINTS = 72;
export const RESNET18_STAGE_SPECS = [
  { outFeatures: 64, blockCount: 2, stride: 1, referenceHeight: 56, referenceWidth: 56 },
  { outFeatures: 64, blockCount: 2, stride: 2, referenceHeight: 28, referenceWidth: 28 },
  { outFeatures: 64, blockCount: 2, stride: 2, referenceHeight: 14, referenceWidth: 14 },
  { outFeatures: 64, blockCount: 2, stride: 2, referenceHeight: 7, referenceWidth: 7 },
] as const;

export function createModuleNodeData(
  kind: ModuleBaseNodeKind,
  common: Pick<ModuleBaseNodeData, 'id' | 'name' | 'type'>,
  options: {
    palettePreset?: ModulePalettePreset;
    pretrainingOrder?: number;
    resNetStageIndex?: number;
  } = {},
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
        time: 'absent',
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
        groups: 1,
        useBias: true,
      };
    case 'ResNetStage': {
      const isPretrained = options.palettePreset === 'pretrained-resnet-stage';
      const stageIndex = Math.max(
        1,
        Math.min(
          RESNET18_STAGE_SPECS.length,
          Math.floor(options.resNetStageIndex ?? 1),
        ),
      );
      const stageSpec = RESNET18_STAGE_SPECS[stageIndex - 1];
      const pretrainingOrder = isPretrained
        ? Math.max(1, Math.floor(options.pretrainingOrder ?? 1))
        : 0;
      return {
        ...base,
        kind,
        initializationMode: 'xavier_normal',
        biasInitializationMode: 'zeros',
        outFeatures: stageSpec.outFeatures,
        blockCount: stageSpec.blockCount,
        stride: stageSpec.stride,
        referenceHeight: stageSpec.referenceHeight,
        referenceWidth: stageSpec.referenceWidth,
        useBias: false,
        pretrainingOrder,
        pretrainedDependencyMemoryPoints: isPretrained
          ? DEFAULT_PRETRAINED_DEPENDENCY_MEMORY_POINTS
          : 0,
      };
    }
    case 'PatchEmbedding':
      return {
        ...base,
        kind,
        initializationMode: 'xavier_normal',
        biasInitializationMode: 'zeros',
        outFeatures: 768,
        patchHeight: 16,
        patchWidth: 16,
        strideHeight: 16,
        strideWidth: 16,
        useBias: true,
      };
    case 'Resize':
      return {
        ...base,
        kind,
        targetHeight: DEFAULT_3D_INPUT_SIZE,
        targetWidth: DEFAULT_3D_INPUT_SIZE,
        interpolation: 'bilinear',
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
    case 'Normalization':
      return {
        ...base,
        kind,
        normalizationMode: 'batch',
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
      spatialView: createSpatialViewFromShape({
        time: 'absent',
        channels: rank,
        height: kind === '3DInput' ? DEFAULT_3D_INPUT_SIZE : 'absent',
        width: kind === '3DInput' ? DEFAULT_3D_INPUT_SIZE : 'absent',
      }),
    };
  }

  if (kind === 'Linear' || kind === 'CNN' || kind === 'ResNetStage' || kind === 'PatchEmbedding') {
    const rank = kind === 'CNN'
      ? 32
      : kind === 'ResNetStage'
        ? 64
      : kind === 'PatchEmbedding'
        ? 768
        : DEFAULT_OUTPUT_DIM;
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
        time: kind === 'PatchEmbedding' ? 'unknown' : 'absent',
        channels: rank,
        height: kind === 'CNN' || kind === 'ResNetStage' ? 'unknown' : 'absent',
        width: kind === 'CNN' || kind === 'ResNetStage' ? 'unknown' : 'absent',
      },
      adaptation: {
        repetition: createEmptyRepetitionStats(),
        distanceIndex: createEmptyDistanceIndexRank(),
      },
      spatialView: createSpatialViewFromShape({
        time: kind === 'PatchEmbedding' ? 'unknown' : 'absent',
        channels: rank,
        height: kind === 'CNN' || kind === 'ResNetStage' ? 'unknown' : 'absent',
        width: kind === 'CNN' || kind === 'ResNetStage' ? 'unknown' : 'absent',
      }),
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
    spatialView: createSpatialViewFromShape({
      time: 'absent',
      channels: 'unknown',
      height: kind === 'Pooling' ? 'unknown' : 'absent',
      width: kind === 'Pooling' ? 'unknown' : 'absent',
    }),
  };
}
