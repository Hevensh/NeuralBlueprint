import type { Edge } from '@xyflow/react';
import { PageType } from '../blueprint/PageTypes';
import type {
  ModuleAnalysisDirection,
  ModuleBaseNode,
  ModuleBaseNodeKind,
  ModuleConfigByKind,
  ModuleNodeData,
  ModuleNodeLock,
} from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';
import {
  createModuleNodeData,
} from '../blueprint/neuralBlueprint/moduleNodeFactory';
import { isModuleBaseNodeKind } from '../blueprint/neuralBlueprint/moduleRegistry';
import { appStorage } from './storageAdapter';

export interface StoredModuleBaseNode<TKind extends ModuleBaseNodeKind> {
  id: string;
  name: string;
  kind: TKind;
  position: {
    x: number;
    y: number;
  };
  locked?: ModuleNodeLock;
}

export type StoredModuleNode = {
  [TKind in ModuleBaseNodeKind]: StoredModuleBaseNode<TKind> & {
    config: ModuleConfigByKind[TKind];
  };
}[ModuleBaseNodeKind];

export interface StoredModuleEdge {
  id: string;
  source: string;
  target: string;
}

export interface StoredNeuralBlueprintGraph {
  nodes: StoredModuleNode[];
  edges: StoredModuleEdge[];
  ui?: {
    analysisDirection?: ModuleAnalysisDirection;
    showRankAnalysis: boolean;
    showVarianceAnalysis: boolean;
    showRepetitionAnalysis?: boolean;
  };
}

const NEURAL_BLUEPRINT_STORAGE_PREFIX = 'neuralBlueprint:';

function getStorageKey(fileId: string) {
  return `${NEURAL_BLUEPRINT_STORAGE_PREFIX}${fileId}`;
}

export function loadNeuralBlueprintGraph(
  fileId: string,
  initialGraph: StoredNeuralBlueprintGraph = { nodes: [], edges: [] },
) {
  const raw = appStorage.getItem(getStorageKey(fileId));
  const parsedGraph = raw ? parseStoredGraph(raw) : undefined;
  const graph = parsedGraph
    && (parsedGraph.nodes.length > 0 || initialGraph.nodes.length === 0)
    ? parsedGraph
    : initialGraph;
  const nodes = buildNodes(graph.nodes, graph.edges);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

  return { nodes, edges };
}

function parseStoredGraph(raw: string): StoredNeuralBlueprintGraph {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value)) return { nodes: [], edges: [] };
    const nodes = Array.isArray(value.nodes)
      ? value.nodes.filter(isStoredModuleNode)
      : [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = Array.isArray(value.edges)
      ? value.edges.filter((edge): edge is StoredModuleEdge => (
        isRecord(edge)
        && typeof edge.id === 'string'
        && typeof edge.source === 'string'
        && typeof edge.target === 'string'
        && nodeIds.has(edge.source)
        && nodeIds.has(edge.target)
      ))
      : [];
    return {
      nodes,
      edges,
      ui: isRecord(value.ui)
        ? {
          analysisDirection: value.ui.analysisDirection === 'backward'
            ? 'backward'
            : 'forward',
          showRankAnalysis: value.ui.showRankAnalysis === true,
          showVarianceAnalysis: value.ui.showVarianceAnalysis === true,
          showRepetitionAnalysis: value.ui.showRepetitionAnalysis === true,
        }
        : undefined,
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function isStoredModuleNode(value: unknown): value is StoredModuleNode {
  if (
    !isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.name !== 'string'
    || typeof value.kind !== 'string'
    || !isModuleBaseNodeKind(value.kind)
    || !isPosition(value.position)
    || !isRecord(value.config)
  ) return false;

  const config = value.config;
  switch (value.kind) {
    case 'Input':
      return isInputConfig(config);
    case '3DInput':
      return isInputConfig(config)
        && isSpatialInputDimension(config.height)
        && isSpatialInputDimension(config.width);
    case 'Linear':
      return isLearnedConfig(config)
        && (config.inFeatures === undefined || isPositive(config.inFeatures));
    case 'CNN':
      return isLearnedConfig(config)
        && isPositive(config.kernelSize)
        && isPositive(config.stride)
        && isNonNegative(config.padding)
        && isPositive(config.dilation);
    case 'Pooling':
      return isPoolMode(config.poolMode)
        && isPositive(config.kernelSize)
        && isPositive(config.stride)
        && isNonNegative(config.padding);
    case 'GlobalPooling':
      return isPoolMode(config.poolMode);
    case 'Dropout':
      return typeof config.dropoutRate === 'number'
        && config.dropoutRate >= 0
        && config.dropoutRate <= 1;
    case 'Output':
      return isPositive(config.neededOutputDim)
        && isDimension(config.neededTime)
        && isDimension(config.neededHeight)
        && isDimension(config.neededWidth);
    case 'Flatten':
    case 'ReLU':
    case 'Sum':
      return Object.keys(config).length === 0;
  }
}

function isInputConfig(config: Record<string, unknown>) {
  return isPositive(config.outFeatures)
    && isNonNegative(config.inputEffectiveRank)
    && (config.normalizationMode === '0-1'
      || config.normalizationMode === 'standard');
}

function isLearnedConfig(config: Record<string, unknown>) {
  return isPositive(config.outFeatures)
    && typeof config.useBias === 'boolean'
    && (config.initializationMode === 'standard_normal'
      || config.initializationMode === 'xavier_normal')
    && (config.biasInitializationMode === 'zeros'
      || config.biasInitializationMode === 'standard_normal');
}

function isPosition(value: unknown) {
  return isRecord(value)
    && Number.isFinite(value.x)
    && Number.isFinite(value.y);
}

function isDimension(value: unknown) {
  return value === 'unknown'
    || value === 'absent'
    || isPositive(value);
}

function isSpatialInputDimension(value: unknown) {
  return value === 'unknown' || isPositive(value);
}

function isPoolMode(value: unknown) {
  return value === 'max' || value === 'average';
}

function isPositive(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegative(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function loadNeuralBlueprintUi(fileId: string) {
  try {
    const raw = appStorage.getItem(getStorageKey(fileId));
    if (!raw) {
      return {
        analysisDirection: 'forward' as const,
        showRankAnalysis: false,
        showVarianceAnalysis: false,
        showRepetitionAnalysis: false,
      };
    }

    const parsed = JSON.parse(raw) as StoredNeuralBlueprintGraph;
    return {
      analysisDirection: parsed.ui?.analysisDirection ?? 'forward',
      showRankAnalysis: parsed.ui?.showRankAnalysis ?? false,
      showVarianceAnalysis: parsed.ui?.showVarianceAnalysis ?? false,
      showRepetitionAnalysis: parsed.ui?.showRepetitionAnalysis ?? false,
    };
  } catch {
    return {
      analysisDirection: 'forward' as const,
      showRankAnalysis: false,
      showVarianceAnalysis: false,
      showRepetitionAnalysis: false,
    };
  }
}

export function saveNeuralBlueprintGraph(
  fileId: string,
  nodes: ModuleBaseNode[],
  edges: Edge[],
  ui: {
    analysisDirection: ModuleAnalysisDirection;
    showRankAnalysis: boolean;
    showVarianceAnalysis: boolean;
    showRepetitionAnalysis: boolean;
  },
) {
  const graph: StoredNeuralBlueprintGraph = {
    nodes: nodes.map((node) => toStoredNode(node)),
    edges: edges
      .filter((edge) => edge.source && edge.target)
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    ui,
  };

  appStorage.setItem(getStorageKey(fileId), JSON.stringify(graph));
}

export function clearNeuralBlueprintGraph(fileId: string) {
  appStorage.removeItem(getStorageKey(fileId));
}

function buildNodes(
  storedNodes: StoredModuleNode[],
  storedEdges: StoredModuleEdge[],
): ModuleBaseNode[] {
  const dataById = new Map<string, ModuleNodeData>();

  storedNodes.forEach((node) => {
    const common = {
      id: node.id,
      name: node.name,
      type: PageType.NeuralBlueprint,
      locked: node.locked,
    };

    dataById.set(node.id, {
      ...createModuleNodeData(node.kind, common),
      ...node.config,
    } as ModuleNodeData);
  });

  storedEdges.forEach((edge) => {
    const source = dataById.get(edge.source);
    const target = dataById.get(edge.target);
    if (!source || !target) return;

    source.successors = [...source.successors, target];
    target.predecessors = [...target.predecessors, source];
    source.links.successorIds.push(target.id);
    target.links.predecessorIds.push(source.id);
  });

  return storedNodes.flatMap((node) => {
    const data = dataById.get(node.id);
    if (!data) return [];
    return [{
      id: node.id,
      type: PageType.NeuralBlueprint,
      position: node.position,
      data,
      draggable: true,
      deletable: !data.locked?.deletion,
      selectable: true,
    }];
  });
}

function toStoredNode(node: ModuleBaseNode): StoredModuleNode {
  const base = {
    id: node.id,
    name: node.data.name,
    position: node.position,
    locked: node.data.locked,
  };

  switch (node.data.kind) {
    case 'Input':
      return {
        ...base,
        kind: 'Input',
        config: {
          normalizationMode: node.data.normalizationMode,
          outFeatures: node.data.outFeatures,
          inputEffectiveRank: node.data.inputEffectiveRank,
        },
      };
    case '3DInput':
      return {
        ...base,
        kind: '3DInput',
        config: {
          normalizationMode: node.data.normalizationMode,
          outFeatures: node.data.outFeatures,
          inputEffectiveRank: node.data.inputEffectiveRank,
          height: node.data.height,
          width: node.data.width,
        },
      };
    case 'Linear':
      return {
        ...base,
        kind: 'Linear',
        config: {
          initializationMode: node.data.initializationMode,
          biasInitializationMode: node.data.biasInitializationMode,
          inFeatures: node.data.inFeatures,
          outFeatures: node.data.outFeatures,
          useBias: node.data.useBias,
        },
      };
    case 'CNN':
      return {
        ...base,
        kind: 'CNN',
        config: {
          initializationMode: node.data.initializationMode,
          biasInitializationMode: node.data.biasInitializationMode,
          outFeatures: node.data.outFeatures,
          kernelSize: node.data.kernelSize,
          stride: node.data.stride,
          padding: node.data.padding,
          dilation: node.data.dilation,
          useBias: node.data.useBias,
        },
      };
    case 'Pooling':
      return {
        ...base,
        kind: 'Pooling',
        config: {
          poolMode: node.data.poolMode,
          kernelSize: node.data.kernelSize,
          stride: node.data.stride,
          padding: node.data.padding,
        },
      };
    case 'GlobalPooling':
      return {
        ...base,
        kind: 'GlobalPooling',
        config: { poolMode: node.data.poolMode },
      };
    case 'Dropout':
      return {
        ...base,
        kind: 'Dropout',
        config: { dropoutRate: node.data.dropoutRate },
      };
    case 'ReLU':
    case 'Sum':
    case 'Flatten':
      return {
        ...base,
        kind: node.data.kind,
        config: {},
      };
    case 'Output':
      return {
        ...base,
        kind: 'Output',
        config: {
          neededOutputDim: node.data.neededOutputDim,
          neededTime: node.data.neededTime,
          neededHeight: node.data.neededHeight,
          neededWidth: node.data.neededWidth,
        },
      };
  }
}
