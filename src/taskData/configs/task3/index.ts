import type { AxisSpatialAdaptation, SpatialBand } from '../../../blueprint/SpatialAdaptationTypes';
import { DEFAULT_PRETRAINED_DEPENDENCY_MEMORY_POINTS } from '../../../blueprint/neuralBlueprint/moduleNodeFactory';
import type { BlueprintTaskFeatureConfig } from '../../blueprintFeatureConfig';
import type {
  TaskFileConfig,
  TaskKnowledgeNodeConfig,
  TaskModuleEdgeConfig,
  TaskModuleNodeConfig,
} from '../../taskFileTypes';

const CIFAR_CLASSES = 10;
const ADAPTATION_REQUIREMENT = 12;
const KNOWLEDGE_MEMORY_REQUIREMENT = 60;
const DEPENDENCY_MEMORY_REQUIREMENT = 72;

export const configFileTask3: BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: [
      'CNN',
      'Resize',
      'Pooling',
      'ResNetStage',
      'GlobalPooling',
      'Normalization',
      'Linear',
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

const sharedKnowledgeGraph = createCifarKnowledgeGraph();

export const configTask3Scratch: TaskFileConfig = {
  seed: '310',
  neuralBlueprint: createResNet18Blueprint(),
  knowledgeGraph: sharedKnowledgeGraph,
};

export const configTask3Pretrained: TaskFileConfig = {
  seed: '310',
  neuralBlueprint: createResNet18Blueprint(true),
  knowledgeGraph: sharedKnowledgeGraph,
  pretraining: { source: 'ImageNet-1K' },
};

function createResNet18Blueprint(
  pretrained = false,
) {
  const nodes: TaskModuleNodeConfig[] = [
    {
      id: 'cifar_input',
      kind: '3DInput',
      position: { x: 0, y: 0 },
      outFeatures: 3,
      inputEffectiveRank: 3,
      height: 32,
      width: 32,
      normalizationMode: 'standard',
      deletable: false,
    },
    {
      id: 'cifar_resize',
      kind: 'Resize',
      position: { x: 1, y: 0 },
      name: 'Resize',
      targetHeight: 224,
      targetWidth: 224,
      interpolation: 'bilinear',
      deletable: false,
    },
    {
      id: 'cifar_stem',
      kind: 'CNN',
      position: { x: 2, y: 0 },
      outFeatures: 64,
      kernelSize: 7,
      stride: 2,
      padding: 3,
      dilation: 1,
      useBias: false,
    },
    {
      id: 'cifar_pool',
      kind: 'Pooling',
      position: { x: 3, y: 0 },
      poolMode: 'max',
      kernelSize: 3,
      stride: 2,
      padding: 1,
    },
    createStage('cifar_res2', 4, 64, 1, 1, pretrained),
    createStage('cifar_res3', 5, 64, 2, 2, pretrained),
    createStage('cifar_res4', 6, 64, 2, 3, pretrained),
    createStage('cifar_res5', 7, 64, 2, 4, pretrained),
    {
      id: 'cifar_global_pool',
      kind: 'GlobalPooling',
      position: { x: 8, y: 0 },
      poolMode: 'average',
    },
    {
      id: 'cifar_classifier',
      kind: 'Linear',
      position: { x: 9, y: 0 },
      outFeatures: CIFAR_CLASSES,
      useBias: true,
    },
    {
      id: 'cifar_output',
      kind: 'Output',
      position: { x: 10, y: 0 },
      neededOutputDim: CIFAR_CLASSES,
      deletable: false,
    },
  ];
  return {
    nodes,
    edges: createChainEdges(nodes.map((node) => node.id)),
    layout: {
      origin: { x: 110, y: 430 },
      gap: { x: 185, y: 130 },
    },
  };
}

function createStage(
  id: string,
  x: number,
  outFeatures: number,
  stride: number,
  pretrainingOrder: number,
  pretrained = false,
): TaskModuleNodeConfig {
  return {
    id,
    name: pretrained
      ? `Pretrained ${pretrainingOrder}`
      : `ResNetStage ${pretrainingOrder}`,
    kind: 'ResNetStage',
    position: { x, y: 0 },
    outFeatures,
    blockCount: 2,
    stride,
    referenceHeight: [56, 28, 14, 7][pretrainingOrder - 1],
    referenceWidth: [56, 28, 14, 7][pretrainingOrder - 1],
    useBias: false,
    pretrainingOrder: pretrained
      ? pretrainingOrder
      : 0,
    pretrainedDependencyMemoryPoints: pretrained
      ? DEFAULT_PRETRAINED_DEPENDENCY_MEMORY_POINTS
      : 0,
  };
}

function createCifarKnowledgeGraph() {
  const nodes: TaskKnowledgeNodeConfig[] = [
    knowledge('edge_orientation', 'Edge orientation', 0, 0, 'small'),
    knowledge('color_contrast', 'Color contrast', 0, 1, 'small'),
    knowledge('local_texture', 'Local texture', 1, 0, 'medium'),
    knowledge('corner_parts', 'Corners and parts', 1, 1, 'medium'),
    knowledge('part_layout', 'Part layout', 2, 0, 'large'),
    knowledge('object_shape', 'Object shape', 2, 1, 'large'),
    knowledge('class_prototype', 'Class prototype', 3, 0, 'extraLarge'),
    knowledge('background_context', 'Background context', 3, 1, 'extraLarge'),
  ];
  const nodeDataAmounts = Object.fromEntries(nodes.map((node) => [node.id, 50000]));

  return {
    nodes,
    edges: [
      dep('edge_orientation', 'local_texture', 'medium'),
      dep('color_contrast', 'local_texture', 'medium'),
      dep('edge_orientation', 'corner_parts', 'medium'),
      dep('local_texture', 'part_layout', 'large'),
      dep('corner_parts', 'part_layout', 'large'),
      dep('corner_parts', 'object_shape', 'large'),
      dep('part_layout', 'object_shape', 'large'),
      dep('object_shape', 'class_prototype', 'extraLarge'),
      dep('color_contrast', 'background_context', 'extraLarge'),
      dep('part_layout', 'background_context', 'extraLarge'),
    ],
    datasets: [{
      id: 'cifar10',
      label: 'CIFAR-10',
      sampleCount: 50000,
      nodeDataAmounts,
      evaluation: {
        classCount: CIFAR_CLASSES,
        difficulty: 1,
        ceiling: 0.965,
        accuracyCurve: 'saturating' as const,
        curveStrength: 13,
        curveExponent: 5,
        learningEfficiency: 0.22,
      },
    }],
    layout: {
      origin: { x: 500, y: 300 },
      gap: { x: 205, y: 145 },
    },
  };
}

function knowledge(
  id: string,
  label: string,
  x: number,
  y: number,
  band: SpatialBand,
): TaskKnowledgeNodeConfig {
  return {
    id,
    label,
    position: { x, y },
    adaptationRequirements: {
      height: scaleRequirement(band),
      width: scaleRequirement(band),
    },
    requiredMemory: KNOWLEDGE_MEMORY_REQUIREMENT,
  };
}

function scaleRequirement(band: SpatialBand): AxisSpatialAdaptation {
  return {
    scale: {
      small: band === 'small' ? ADAPTATION_REQUIREMENT : 0,
      medium: band === 'medium' ? ADAPTATION_REQUIREMENT : 0,
      large: band === 'large' ? ADAPTATION_REQUIREMENT : 0,
      extraLarge: band === 'extraLarge' ? ADAPTATION_REQUIREMENT : 0,
      global: band === 'global' ? ADAPTATION_REQUIREMENT : 0,
    },
    index: { small: 0, medium: 0, large: 0, extraLarge: 0, global: 0 },
  };
}

function dep(source: string, target: string, band: SpatialBand) {
  return {
    kind: 'dependency' as const,
    source,
    target,
    requiredMemory: DEPENDENCY_MEMORY_REQUIREMENT,
    lambda: 1.6,
    overfitCoefficient: 1,
    adaptationRequirements: {
      height: scaleRequirement(band),
      width: scaleRequirement(band),
    },
  };
}

function createChainEdges(ids: string[]): TaskModuleEdgeConfig[] {
  return ids.slice(1).map((target, index) => ({
    source: ids[index],
    target,
  }));
}
