import type {
  AxisSpatialAdaptation,
  SpatialBand,
} from '../../../blueprint/SpatialAdaptationTypes';
import {
  DEFAULT_SPATIAL_AXIS_REQUIREMENT,
} from '../../../blueprint/SpatialAdaptationTypes';
import type { BlueprintTaskFeatureConfig } from '../../blueprintFeatureConfig';
import type {
  TaskFileConfig,
  TaskKnowledgeGraphConfig,
  TaskKnowledgeNodeConfig,
  TaskModuleEdgeConfig,
  TaskModuleNodeConfig,
} from '../../taskFileTypes';

const STAGE_BANDS = ['small', 'medium', 'large', 'extraLarge'] as const;
const STAGE_COLUMNS = 3;
const CNN_COUNT = 11;
const CHANNELS = 32;

export const configFileCnnScaleExperiment: BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: [
      '3DInput',
      'CNN',
      'PatchEmbedding',
      'Sum',
      'GlobalPooling',
      'Output',
    ],
    showBackwardAnalysisControl: true,
    showVarianceAnalysisToggle: true,
    showRankAnalysisToggle: true,
    showRepetitionAnalysisToggle: true,
    showDistanceIndexAnalysisToggle: true,
  },
  knowledgeGraph: {
    canOpenTab: true,
    showKnowledgeGraphControls: true,
    networkCapabilityMode: 'blueprint',
    showAllocationButtons: true,
    enableMemoryAnalysis: true,
    enableMasteryOverfitAnalysis: true,
    enableUtilityAnalysis: true,
    enableGlobalDebugPreview: true,
  },
};

const sharedKnowledgeGraph = createStagedKnowledgeGraph();

export const configCnnScaleBaseline: TaskFileConfig = {
  seed: '31415',
  neuralBlueprint: createBaselineBlueprint(),
  knowledgeGraph: sharedKnowledgeGraph,
};

export const configCnnScaleMultiSize: TaskFileConfig = {
  seed: '31415',
  neuralBlueprint: createMultiSizeBlueprint(),
  knowledgeGraph: sharedKnowledgeGraph,
};

function createStagedKnowledgeGraph(): TaskKnowledgeGraphConfig {
  const nodes: TaskKnowledgeNodeConfig[] = STAGE_BANDS.flatMap(
    (band, stageIndex) => Array.from(
      { length: STAGE_COLUMNS },
      (_, columnIndex) => ({
        id: `scale_${band}_${columnIndex + 1}`,
        label: `${bandLabel(band)}${columnIndex + 1}`,
        position: { x: columnIndex, y: stageIndex },
        adaptationRequirements: {
          height: createScaleRequirement(band),
          width: createScaleRequirement(band),
        },
      }),
    ),
  );
  const edges = STAGE_BANDS.slice(1).flatMap((band, stageIndex) => (
    Array.from({ length: STAGE_COLUMNS }, (_, columnIndex) => ({
      kind: 'dependency' as const,
      source: `scale_${STAGE_BANDS[stageIndex]}_${columnIndex + 1}`,
      target: `scale_${band}_${columnIndex + 1}`,
    }))
  ));
  const nodeDataAmounts = Object.fromEntries(
    nodes.map((node) => [node.id, 90]),
  );

  return {
    nodes,
    edges,
    datasets: [{ id: 'shared_scale_dataset', nodeDataAmounts }],
    layout: {
      origin: { x: 520, y: 280 },
      gap: { x: 190, y: 130 },
    },
  };
}

function createBaselineBlueprint() {
  const cnnNodes: TaskModuleNodeConfig[] = Array.from(
    { length: CNN_COUNT },
    (_, index) => createCnnNode(`baseline_cnn_${index + 1}`, 3, {
      x: index + 1,
      y: 0,
    }),
  );
  const chainIds = [
    'baseline_input',
    ...cnnNodes.map((node) => node.id),
    'baseline_global_pool',
    'baseline_output',
  ];

  return {
    nodes: [
      createInputNode('baseline_input', { x: 0, y: 0 }),
      ...cnnNodes,
      createGlobalPoolNode('baseline_global_pool', { x: 12, y: 0 }),
      createOutputNode('baseline_output', { x: 13, y: 0 }),
    ],
    edges: createChainEdges(chainIds),
    layout: {
      origin: { x: 120, y: 420 },
      gap: { x: 170, y: 135 },
    },
  };
}

function createMultiSizeBlueprint() {
  const localIds = ['multi_local_1', 'multi_local_2'];
  const mediumIds = ['multi_medium_1', 'multi_medium_2', 'multi_medium_3'];
  const largeIds = [
    'multi_large_1',
    'multi_large_2',
    'multi_large_3',
    'multi_large_4',
    'multi_large_5',
  ];
  const branchNodes = [
    ...localIds.map((id, index) => createCnnNode(id, 3, {
      x: index + 2,
      y: -2,
    })),
    ...mediumIds.map((id, index) => createCnnNode(id, 5, {
      x: index + 2,
      y: 0,
    })),
    ...largeIds.map((id, index) => createCnnNode(id, 5, {
      x: index + 2,
      y: 2,
    })),
  ];
  const branchEdges = [localIds, mediumIds, largeIds].flatMap((ids) => [
    { source: 'multi_stem', target: ids[0] },
    ...createChainEdges(ids),
    { source: ids.at(-1)!, target: 'multi_sum' },
  ]);

  return {
    nodes: [
      createInputNode('multi_input', { x: 0, y: 0 }),
      createCnnNode('multi_stem', 3, { x: 1, y: 0 }),
      ...branchNodes,
      {
        id: 'multi_sum',
        kind: 'Sum' as const,
        position: { x: 7, y: 0 },
      },
      createGlobalPoolNode('multi_global_pool', { x: 8, y: 0 }),
      createOutputNode('multi_output', { x: 9, y: 0 }),
    ],
    edges: [
      { source: 'multi_input', target: 'multi_stem' },
      ...branchEdges,
      { source: 'multi_sum', target: 'multi_global_pool' },
      { source: 'multi_global_pool', target: 'multi_output' },
    ],
    layout: {
      origin: { x: 120, y: 420 },
      gap: { x: 180, y: 125 },
    },
  };
}

function createScaleRequirement(band: SpatialBand): AxisSpatialAdaptation {
  return {
    scale: {
      small: band === 'small' ? DEFAULT_SPATIAL_AXIS_REQUIREMENT : 0,
      medium: band === 'medium' ? DEFAULT_SPATIAL_AXIS_REQUIREMENT : 0,
      large: band === 'large' ? DEFAULT_SPATIAL_AXIS_REQUIREMENT : 0,
      extraLarge: band === 'extraLarge'
        ? DEFAULT_SPATIAL_AXIS_REQUIREMENT
        : 0,
      global: band === 'global' ? DEFAULT_SPATIAL_AXIS_REQUIREMENT : 0,
    },
    index: {
      small: 0,
      medium: 0,
      large: 0,
      extraLarge: 0,
      global: 0,
    },
  };
}

function createInputNode(id: string, position: { x: number; y: number }) {
  return {
    id,
    kind: '3DInput' as const,
    position,
    outFeatures: 3,
    inputEffectiveRank: 3,
    height: 224,
    width: 224,
    normalizationMode: '0-1' as const,
    deletable: false,
  };
}

function createCnnNode(
  id: string,
  kernelSize: number,
  position: { x: number; y: number },
) {
  return {
    id,
    kind: 'CNN' as const,
    position,
    outFeatures: CHANNELS,
    kernelSize,
    stride: 1,
    padding: Math.floor(kernelSize / 2),
    dilation: 1,
    initializationMode: 'xavier_normal' as const,
    biasInitializationMode: 'zeros' as const,
    useBias: true,
  };
}

function createGlobalPoolNode(
  id: string,
  position: { x: number; y: number },
) {
  return {
    id,
    kind: 'GlobalPooling' as const,
    position,
    poolMode: 'average' as const,
  };
}

function createOutputNode(
  id: string,
  position: { x: number; y: number },
) {
  return {
    id,
    kind: 'Output' as const,
    position,
    neededOutputDim: CHANNELS,
    deletable: false,
  };
}

function createChainEdges(ids: string[]): TaskModuleEdgeConfig[] {
  return ids.slice(1).map((target, index) => ({
    source: ids[index],
    target,
  }));
}

function bandLabel(band: typeof STAGE_BANDS[number]) {
  return band === 'small'
    ? 'S'
    : band === 'medium'
      ? 'M'
      : band === 'large'
        ? 'L'
        : 'XL';
}
