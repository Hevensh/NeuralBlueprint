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
} from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';
import { createModuleNodeData } from '../blueprint/neuralBlueprint/moduleNodeFactory';
import { appStorage } from './storageAdapter';

interface StoredModuleBaseNode<TKind extends ModuleBaseNodeKind> {
  id: string;
  name: string;
  kind: TKind;
  position: {
    x: number;
    y: number;
  };
}

interface StoredInputNode extends StoredModuleBaseNode<'Input'> {
  outputDim: number;
  effectiveRank: number;
  normalizationMode?: InputNormalizationMode;
}

interface StoredLinearNode extends StoredModuleBaseNode<'Linear'> {
  outputDim: number;
  inFeatures?: number;
  useBias?: boolean;
  initializationMode?: LinearInitializationMode;
  biasInitializationMode?: BiasInitializationMode;
}

interface StoredDropoutNode extends StoredModuleBaseNode<'Dropout'> {
  dropoutRate?: number;
}

type StoredModuleNode =
  | StoredInputNode
  | StoredLinearNode
  | StoredDropoutNode
  | StoredModuleBaseNode<'ReLU'>
  | StoredModuleBaseNode<'Sum'>
  | StoredModuleBaseNode<'Output'>;

interface StoredModuleEdge {
  id: string;
  source: string;
  target: string;
}

interface StoredNeuralBlueprintGraph {
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

export function loadNeuralBlueprintGraph(fileId: string) {
  try {
    const raw = appStorage.getItem(getStorageKey(fileId));
    if (!raw) {
      return { nodes: [], edges: [] };
    }

    const parsed = JSON.parse(raw) as StoredNeuralBlueprintGraph;
    const nodes = buildNodes(parsed.nodes ?? [], parsed.edges ?? []);
    const edges = (parsed.edges ?? []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    return { nodes, edges };
  } catch {
    return { nodes: [], edges: [] };
  }
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
      case 'Output':
        dataById.set(node.id, createModuleNodeData(node.kind, common));
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
    selectable: true,
  }));
}

function toStoredNode(node: ModuleBaseNode): StoredModuleNode {
  const base = {
    id: node.id,
    name: node.data.name,
    position: node.position,
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
    case 'Output':
      return {
        ...base,
        kind: node.data.kind,
      };
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
