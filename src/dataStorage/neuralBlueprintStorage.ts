import type { Edge } from '@xyflow/react';
import { PageType } from '../blueprint/PageTypes';
import type {
  BiasInitializationMode,
  DropoutNodeData,
  InputNodeData,
  InputNormalizationMode,
  LinearNodeData,
  LinearInitializationMode,
  ModuleAnalysisDirection,
  ModuleBaseNode,
  ModuleBaseNodeKind,
  ModuleNodeData,
  ModuleNodeLock,
  OutputNodeData,
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

export interface StoredOutputNode extends StoredModuleBaseNode<'Output'> {
  neededOutputDim?: number;
}

export type StoredModuleNode =
  | StoredInputNode
  | StoredLinearNode
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
  const edges = graph.edges.map((edge) => ({
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
      };
    }

    const parsed = JSON.parse(raw) as StoredNeuralBlueprintGraph;
    return {
      analysisDirection: parsed.ui?.analysisDirection ?? 'forward',
      showRankAnalysis: parsed.ui?.showRankAnalysis ?? false,
      showVarianceAnalysis: parsed.ui?.showVarianceAnalysis ?? false,
    };
  } catch {
    return {
      analysisDirection: 'forward' as const,
      showRankAnalysis: false,
      showVarianceAnalysis: false,
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
      case 'Dropout':
        dataById.set(node.id, {
          ...createModuleNodeData('Dropout', common),
          dropoutRate: node.dropoutRate ?? 0.5,
        });
        break;
      case 'ReLU':
      case 'Sum':
        dataById.set(node.id, createModuleNodeData(node.kind, common));
        break;
      case 'Output':
        dataById.set(node.id, {
          ...createModuleNodeData('Output', common),
          neededOutputDim: node.neededOutputDim ?? DEFAULT_OUTPUT_DIM,
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

  return storedNodes.map((node) => ({
    id: node.id,
    type: PageType.NeuralBlueprint,
    position: node.position,
    data: dataById.get(node.id) as ModuleNodeData,
    draggable: true,
    deletable: !dataById.get(node.id)?.locked?.deletion,
    selectable: true,
  }));
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
    case 'Linear':
      return toStoredLinearNode(base, node.data);
    case 'Dropout':
      return toStoredDropoutNode(base, node.data);
    case 'ReLU':
    case 'Sum':
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
  base: Omit<StoredOutputNode, 'kind'>,
  data: OutputNodeData,
): StoredOutputNode {
  return {
    ...base,
    kind: 'Output',
    neededOutputDim: data.neededOutputDim,
  };
}
