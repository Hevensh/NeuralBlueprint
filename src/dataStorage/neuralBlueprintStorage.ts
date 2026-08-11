import type { Edge } from '@xyflow/react';
import { PageType } from '../blueprint/PageTypes';
import type {
  BiasInitializationMode,
  CNNNodeData,
  DropoutNodeData,
  InputNodeData,
  InputNormalizationMode,
  LinearNodeData,
  LinearInitializationMode,
  ModuleAnalysisDirection,
  ModuleBaseNode,
  ModuleBaseNodeKind,
  ModuleDimension,
  ModuleNodeData,
  ModuleNodeLock,
  OutputNodeData,
  PoolMode,
  PoolingNodeData,
  ThreeDInputNodeData,
} from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';
import {
  createModuleNodeData,
  DEFAULT_OUTPUT_DIM,
} from '../blueprint/neuralBlueprint/moduleNodeFactory';
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

export interface StoredInputNode extends StoredModuleBaseNode<'Input'> {
  outputDim: number;
  effectiveRank: number;
  normalizationMode?: InputNormalizationMode;
}

export interface StoredThreeDInputNode extends StoredModuleBaseNode<'3DInput'> {
  outputDim: number;
  effectiveRank: number;
  normalizationMode?: InputNormalizationMode;
  height: Exclude<ModuleDimension, 'absent'>;
  width: Exclude<ModuleDimension, 'absent'>;
}

export interface StoredLinearNode extends StoredModuleBaseNode<'Linear'> {
  outputDim: number;
  inFeatures?: number;
  useBias?: boolean;
  initializationMode?: LinearInitializationMode;
  biasInitializationMode?: BiasInitializationMode;
}

export interface StoredDropoutNode extends StoredModuleBaseNode<'Dropout'> {
  dropoutRate?: number;
}

export interface StoredCNNNode extends StoredModuleBaseNode<'CNN'> {
  outputDim: number;
  kernelSize: number;
  stride: number;
  padding: number;
  dilation: number;
  useBias: boolean;
  initializationMode: LinearInitializationMode;
  biasInitializationMode: BiasInitializationMode;
}

export interface StoredPoolingNode extends StoredModuleBaseNode<'Pooling'> {
  poolMode: PoolMode;
  kernelSize: number;
  stride: number;
  padding: number;
}

export interface StoredGlobalPoolingNode extends StoredModuleBaseNode<'GlobalPooling'> {
  poolMode: PoolMode;
}

export interface StoredOutputNode extends StoredModuleBaseNode<'Output'> {
  neededOutputDim?: number;
  neededTime: ModuleDimension;
  neededHeight: ModuleDimension;
  neededWidth: ModuleDimension;
}

export type StoredModuleNode =
  | StoredInputNode
  | StoredThreeDInputNode
  | StoredLinearNode
  | StoredCNNNode
  | StoredPoolingNode
  | StoredModuleBaseNode<'Flatten'>
  | StoredGlobalPoolingNode
  | StoredDropoutNode
  | StoredModuleBaseNode<'ReLU'>
  | StoredModuleBaseNode<'Sum'>
  | StoredOutputNode;

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
  const graph = raw
    ? JSON.parse(raw) as StoredNeuralBlueprintGraph
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
      position: node.position,
      locked: node.locked,
    };

    switch (node.kind) {
      case 'Input':
        dataById.set(node.id, {
          ...createModuleNodeData('Input', common),
          normalizationMode: node.normalizationMode ?? '0-1',
          outFeatures: node.outputDim ?? 64,
          inputEffectiveRank: node.effectiveRank ?? 32,
        });
        break;
      case '3DInput':
        dataById.set(node.id, {
          ...createModuleNodeData('3DInput', common),
          normalizationMode: node.normalizationMode ?? '0-1',
          outFeatures: node.outputDim,
          inputEffectiveRank: node.effectiveRank,
          height: node.height,
          width: node.width,
        });
        break;
      case 'CNN':
        dataById.set(node.id, {
          ...createModuleNodeData('CNN', common),
          initializationMode: node.initializationMode,
          biasInitializationMode: node.biasInitializationMode,
          outFeatures: node.outputDim,
          kernelSize: node.kernelSize,
          stride: node.stride,
          padding: node.padding,
          dilation: node.dilation,
          useBias: node.useBias,
        });
        break;
      case 'Pooling':
        dataById.set(node.id, {
          ...createModuleNodeData('Pooling', common),
          poolMode: node.poolMode,
          kernelSize: node.kernelSize,
          stride: node.stride,
          padding: node.padding,
        });
        break;
      case 'Linear':
        dataById.set(node.id, {
          ...createModuleNodeData('Linear', common),
          initializationMode: node.initializationMode ?? 'xavier_normal',
          biasInitializationMode: node.biasInitializationMode ?? 'zeros',
          inFeatures: node.inFeatures,
          outFeatures: node.outputDim ?? 64,
          useBias: node.useBias ?? true,
        });
        break;
      case 'GlobalPooling':
        dataById.set(node.id, {
          ...createModuleNodeData('GlobalPooling', common),
          poolMode: node.poolMode,
        });
        break;
      case 'Dropout':
        dataById.set(node.id, {
          ...createModuleNodeData('Dropout', common),
          dropoutRate: node.dropoutRate ?? 0.5,
        });
        break;
      case 'ReLU':
      case 'Sum':
      case 'Flatten':
        dataById.set(node.id, createModuleNodeData(node.kind, common));
        break;
      case 'Output':
        dataById.set(node.id, {
          ...createModuleNodeData('Output', common),
          neededOutputDim: node.neededOutputDim ?? DEFAULT_OUTPUT_DIM,
          neededTime: node.neededTime,
          neededHeight: node.neededHeight,
          neededWidth: node.neededWidth,
        });
        break;
    }
  });

  storedEdges.forEach((edge) => {
    const source = dataById.get(edge.source);
    const target = dataById.get(edge.target);
    if (!source || !target) return;

    source.successors = [...source.successors, target];
    target.predecessors = [...target.predecessors, source];
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
      return toStoredInputNode(base, node.data);
    case '3DInput':
      return toStoredThreeDInputNode(base, node.data);
    case 'Linear':
      return toStoredLinearNode(base, node.data);
    case 'CNN':
      return toStoredCNNNode(base, node.data);
    case 'Pooling':
      return toStoredPoolingNode(base, node.data);
    case 'GlobalPooling':
      return {
        ...base,
        kind: 'GlobalPooling',
        poolMode: node.data.poolMode,
      };
    case 'Dropout':
      return toStoredDropoutNode(base, node.data);
    case 'ReLU':
    case 'Sum':
    case 'Flatten':
      return {
        ...base,
        kind: node.data.kind,
      };
    case 'Output':
      return toStoredOutputNode(base, node.data);
  }
}

function toStoredInputNode(
  base: Omit<StoredModuleBaseNode<'Input'>, 'kind'>,
  data: InputNodeData,
): StoredInputNode {
  return {
    ...base,
    kind: 'Input',
    outputDim: data.outFeatures,
    effectiveRank: data.inputEffectiveRank,
    normalizationMode: data.normalizationMode,
  };
}

function toStoredThreeDInputNode(
  base: Omit<StoredModuleBaseNode<'3DInput'>, 'kind'>,
  data: ThreeDInputNodeData,
): StoredThreeDInputNode {
  return {
    ...base,
    kind: '3DInput',
    outputDim: data.outFeatures,
    effectiveRank: data.inputEffectiveRank,
    normalizationMode: data.normalizationMode,
    height: data.height,
    width: data.width,
  };
}

function toStoredCNNNode(
  base: Omit<StoredModuleBaseNode<'CNN'>, 'kind'>,
  data: CNNNodeData,
): StoredCNNNode {
  return {
    ...base,
    kind: 'CNN',
    outputDim: data.outFeatures,
    kernelSize: data.kernelSize,
    stride: data.stride,
    padding: data.padding,
    dilation: data.dilation,
    useBias: data.useBias,
    initializationMode: data.initializationMode,
    biasInitializationMode: data.biasInitializationMode,
  };
}

function toStoredPoolingNode(
  base: Omit<StoredModuleBaseNode<'Pooling'>, 'kind'>,
  data: PoolingNodeData,
): StoredPoolingNode {
  return {
    ...base,
    kind: 'Pooling',
    poolMode: data.poolMode,
    kernelSize: data.kernelSize,
    stride: data.stride,
    padding: data.padding,
  };
}

function toStoredLinearNode(
  base: Omit<StoredModuleBaseNode<'Linear'>, 'kind'>,
  data: LinearNodeData,
): StoredLinearNode {
  return {
    ...base,
    kind: 'Linear',
    outputDim: data.outFeatures,
    inFeatures: data.inFeatures,
    useBias: data.useBias,
    initializationMode: data.initializationMode,
    biasInitializationMode: data.biasInitializationMode,
  };
}

function toStoredDropoutNode(
  base: Omit<StoredModuleBaseNode<'Dropout'>, 'kind'>,
  data: DropoutNodeData,
): StoredDropoutNode {
  return {
    ...base,
    kind: 'Dropout',
    dropoutRate: data.dropoutRate,
  };
}

function toStoredOutputNode(
  base: Omit<StoredModuleBaseNode<'Output'>, 'kind'>,
  data: OutputNodeData,
): StoredOutputNode {
  return {
    ...base,
    kind: 'Output',
    neededOutputDim: data.neededOutputDim,
    neededTime: data.neededTime,
    neededHeight: data.neededHeight,
    neededWidth: data.neededWidth,
  };
}
