import type { StoredNeuralBlueprintGraph } from '../dataStorage/neuralBlueprintStorage';
import type {
  KnowledgeDatasetCollection,
} from '../blueprint/knowledgeGraph/model/datasetSplit';
import type {
  DependencyEdge,
  InterferenceEdge,
  KnowledgeGraphDefinition,
  KnowledgeNode,
  SubstituteEdge,
} from '../blueprint/knowledgeGraph/model/types';
import {
  createSeededRandom,
  randomInt,
  type Random,
} from '../blueprint/knowledgeGraph/model/random';
import {
  createGeneratedKnowledgeEdgeProperties,
  createGeneratedKnowledgeNode,
  createGeneratedKnowledgeNodeColors,
} from '../blueprint/knowledgeGraph/model/graphGenerator';
import {
  MODULE_LAYOUT_COLUMN_GAP,
  MODULE_LAYOUT_START_X,
  MODULE_LAYOUT_START_Y,
  getNodeHeight,
} from '../blueprint/neuralBlueprint/utils/arrangeNodes';
import {
  DEFAULT_3D_INPUT_CHANNELS,
  DEFAULT_3D_INPUT_SIZE,
} from '../blueprint/neuralBlueprint/moduleNodeFactory';
import { TASK_FILE_CONFIGS } from './configs';
import { DEFAULT_DATASET_SPLIT_RATIO } from './knowledgeGraphDefaults';
import type {
  TaskFileConfig,
  TaskFileInitialState,
  TaskGridPosition,
  TaskKnowledgeDatasetConfig,
  TaskKnowledgeEdgeConfig,
  TaskKnowledgeGraphConfig,
  TaskKnowledgeNodeConfig,
  TaskLayoutConfig,
  TaskModuleNodeConfig,
  TaskNeuralBlueprintConfig,
} from './taskFileTypes';

const DEFAULT_BLUEPRINT_LAYOUT: ResolvedTaskLayout = {
  origin: {
    x: MODULE_LAYOUT_START_X,
    y: MODULE_LAYOUT_START_Y,
  },
  gap: {
    x: MODULE_LAYOUT_COLUMN_GAP,
    y: getNodeHeight(),
  },
};

const DEFAULT_KNOWLEDGE_LAYOUT: ResolvedTaskLayout = {
  origin: {
    x: 640,
    y: 450,
  },
  gap: {
    x: 180,
    y: 120,
  },
};

export function getTaskFileInitialState(
  fileId: string,
): TaskFileInitialState | undefined {
  const config = TASK_FILE_CONFIGS[fileId];
  if (!config) return undefined;
  return buildTaskFileInitialState(config);
}

function buildTaskFileInitialState(config: TaskFileConfig): TaskFileInitialState {
  return {
    neuralBlueprint: config.neuralBlueprint
      ? { graph: buildNeuralBlueprintGraph(config.neuralBlueprint) }
      : undefined,
    knowledgeGraph: config.knowledgeGraph
      ? buildKnowledgeGraphState(config.knowledgeGraph, config.seed)
      : undefined,
  };
}

function buildNeuralBlueprintGraph(
  config: TaskNeuralBlueprintConfig,
): StoredNeuralBlueprintGraph {
  const layout = resolveLayout(config.layout, DEFAULT_BLUEPRINT_LAYOUT);

  return {
    nodes: config.nodes.map((node) => toStoredModuleNodeConfig(node, layout)),
    edges: (config.edges ?? []).map((edge) => ({
      id: edge.id ?? `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
    })),
  };
}

function toStoredModuleNodeConfig(
  node: TaskModuleNodeConfig,
  layout: ResolvedTaskLayout,
): StoredNeuralBlueprintGraph['nodes'][number] {
  const base = {
    id: node.id,
    name: node.kind,
    kind: node.kind,
    position: resolvePosition(node.position, layout),
    locked: {
      deletion: node.deletable === false,
      properties: node.lockedProperties,
    },
  };

  if (node.kind === 'Input') {
    return {
      ...base,
      kind: 'Input',
      config: {
        outFeatures: node.outFeatures ?? 64,
        inputEffectiveRank: node.inputEffectiveRank ?? 32,
        normalizationMode: node.normalizationMode ?? '0-1',
      },
    };
  }

  if (node.kind === '3DInput') {
    return {
      ...base,
      kind: '3DInput',
      config: {
        outFeatures: node.outFeatures ?? DEFAULT_3D_INPUT_CHANNELS,
        inputEffectiveRank: node.inputEffectiveRank
          ?? DEFAULT_3D_INPUT_CHANNELS,
        normalizationMode: node.normalizationMode ?? '0-1',
        height: node.height === 'absent'
          ? 'unknown'
          : node.height ?? DEFAULT_3D_INPUT_SIZE,
        width: node.width === 'absent'
          ? 'unknown'
          : node.width ?? DEFAULT_3D_INPUT_SIZE,
      },
    };
  }

  if (node.kind === 'Linear') {
    return {
      ...base,
      kind: 'Linear',
      config: {
        outFeatures: node.outFeatures ?? 64,
        useBias: node.useBias ?? true,
        initializationMode: node.initializationMode ?? 'xavier_normal',
        biasInitializationMode: node.biasInitializationMode ?? 'zeros',
      },
    };
  }

  if (node.kind === 'CNN') {
    return {
      ...base,
      kind: 'CNN',
      config: {
        outFeatures: node.outFeatures ?? 32,
        kernelSize: node.kernelSize ?? 3,
        stride: node.stride ?? 1,
        padding: node.padding ?? 1,
        dilation: node.dilation ?? 1,
        useBias: node.useBias ?? true,
        initializationMode: node.initializationMode ?? 'xavier_normal',
        biasInitializationMode: node.biasInitializationMode ?? 'zeros',
      },
    };
  }

  if (node.kind === 'Pooling') {
    return {
      ...base,
      kind: 'Pooling',
      config: {
        poolMode: node.poolMode ?? 'max',
        kernelSize: node.kernelSize ?? 2,
        stride: node.stride ?? 2,
        padding: node.padding ?? 0,
      },
    };
  }

  if (node.kind === 'GlobalPooling') {
    return {
      ...base,
      kind: 'GlobalPooling',
      config: { poolMode: node.poolMode ?? 'average' },
    };
  }

  if (node.kind === 'Output') {
    return {
      ...base,
      kind: 'Output',
      config: {
        neededOutputDim: node.neededOutputDim ?? 64,
        neededTime: node.time ?? 'absent',
        neededHeight: node.height ?? 'absent',
        neededWidth: node.width ?? 'absent',
      },
    };
  }

  if (node.kind === 'Dropout') {
    return {
      ...base,
      kind: 'Dropout',
      config: { dropoutRate: node.dropoutRate ?? 0.5 },
    };
  }

  return {
    ...base,
    kind: node.kind,
    config: {},
  };
}

function buildKnowledgeGraphState(
  config: TaskKnowledgeGraphConfig,
  seed: string,
): TaskFileInitialState['knowledgeGraph'] {
  const random = createSeededRandom(seed);
  const layout = resolveLayout(config.layout, DEFAULT_KNOWLEDGE_LAYOUT);
  const colors = createGeneratedKnowledgeNodeColors(config.nodes.length, random);
  const nodes = Object.fromEntries(
    config.nodes.map((node, index) => [
      node.id,
      createKnowledgeNode(node, index, random, layout, colors[index]),
    ]),
  );
  const graphDefinition: KnowledgeGraphDefinition = {
    nodes,
    depEdges: [],
    subEdges: [],
    interEdges: [],
  };

  (config.edges ?? []).forEach((edge, index) => {
    const parsedEdge = createKnowledgeEdge(
      edge,
      index,
      nodes,
      createSeededRandom(`${seed}:edge:${index}`),
    );
    if (!parsedEdge) return;
    if (parsedEdge.kind === 'dependency') graphDefinition.depEdges.push(parsedEdge);
    else if (parsedEdge.kind === 'substitute') graphDefinition.subEdges.push(parsedEdge);
    else graphDefinition.interEdges.push(parsedEdge);
  });

  return {
    graphDefinition,
    datasetCollection: buildKnowledgeDatasetCollection(
      config.datasets ?? [],
      nodes,
      seed,
    ),
  };
}

function createKnowledgeNode(
  config: TaskKnowledgeNodeConfig,
  index: number,
  random: Random,
  layout: ResolvedTaskLayout,
  color: string,
): KnowledgeNode {
  return createGeneratedKnowledgeNode(
    random,
    config.id,
    `K${index + 1}`,
    resolvePosition(config.position ?? { x: index, y: 0 }, layout),
    color,
  );
}

interface ResolvedTaskLayout {
  origin: TaskGridPosition;
  gap: TaskGridPosition;
}

function resolveLayout(
  layout: TaskLayoutConfig | undefined,
  defaultLayout: ResolvedTaskLayout,
): ResolvedTaskLayout {
  return {
    origin: layout?.origin ?? defaultLayout.origin,
    gap: layout?.gap ?? defaultLayout.gap,
  };
}

function resolvePosition(
  position: TaskGridPosition,
  layout: ResolvedTaskLayout,
) {
  return {
    x: layout.origin.x + position.x * layout.gap.x,
    y: layout.origin.y + position.y * layout.gap.y,
  };
}

function createKnowledgeEdge(
  config: TaskKnowledgeEdgeConfig,
  index: number,
  nodes: Record<string, KnowledgeNode>,
  random: Random,
): DependencyEdge | SubstituteEdge | InterferenceEdge | null {
  const source = nodes[config.source];
  const target = nodes[config.target];
  if (!source || !target) return null;

  return {
    kind: config.kind,
    id: config.id ?? `${config.kind}_${index + 1}`,
    source,
    target,
    properties: createGeneratedKnowledgeEdgeProperties(random, config.kind),
  } as DependencyEdge | SubstituteEdge | InterferenceEdge;
}

function buildKnowledgeDatasetCollection(
  configs: TaskKnowledgeDatasetConfig[],
  nodes: Record<string, KnowledgeNode>,
  seed: string,
): KnowledgeDatasetCollection {
  const datasetConfigs: TaskKnowledgeDatasetConfig[] = configs.length > 0
    ? configs
    : [{}];
  const random = createSeededRandom(`${seed}:datasets`);
  const datasets = datasetConfigs.map(
    (dataset, index) => ({
      id: dataset.id ?? `dataset_${index + 1}`,
      label: `Dataset ${index + 1}`,
      seed: String(Number.parseInt(seed, 10) + index || index + 1),
      enabled: true,
      color: pickColor(DATASET_COLORS, random),
      splitRatio: DEFAULT_DATASET_SPLIT_RATIO,
      nodeDataAmounts: Object.fromEntries(
        Object.keys(nodes).map((nodeId) => [
          nodeId,
          Math.max(0, Math.round(dataset.nodeDataAmounts?.[nodeId] ?? 0)),
        ]),
      ),
    }),
  );

  return {
    activeDatasetId: datasets[0]?.id ?? '',
    datasets,
  };
}

function pickColor(colors: string[], random: Random) {
  return colors[randomInt(random, 0, colors.length - 1)];
}

const DATASET_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
];
