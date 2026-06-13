import type { Edge } from '@xyflow/react';
import { PageType } from '../blueprint/PageTypes';
import type {
  BiasInitializationMode,
  InputNormalizationMode,
  LinearInitializationMode,
  ModuleBaseNode,
  ModuleBaseNodeData,
  ModuleBaseNodeKind,
  ModuleVarianceStats,
} from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';
import { appStorage } from './storageAdapter';

interface StoredModuleBaseNode {
  id: string;
  name: string;
  kind: ModuleBaseNodeKind;
  position: {
    x: number;
    y: number;
  };
  forwardTopologyOrder?: number;
  backwardTopologyOrder?: number;
  outputDim: number;
  effectiveRank?: number;
  varianceStats?: ModuleVarianceStats;
  normalizationMode?: InputNormalizationMode;
  initializationMode?: LinearInitializationMode;
  biasInitializationMode?: BiasInitializationMode;
}

interface StoredModuleEdge {
  id: string;
  source: string;
  target: string;
}

interface StoredNeuralBlueprintGraph {
  nodes: StoredModuleBaseNode[];
  edges: StoredModuleEdge[];
  ui?: {
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
        showRankAnalysis: false,
        showVarianceAnalysis: false,
      };
    }

    const parsed = JSON.parse(raw) as StoredNeuralBlueprintGraph;
    return {
      showRankAnalysis: parsed.ui?.showRankAnalysis ?? false,
      showVarianceAnalysis: parsed.ui?.showVarianceAnalysis ?? false,
    };
  } catch {
    return {
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
  storedNodes: StoredModuleBaseNode[],
  storedEdges: StoredModuleEdge[],
): ModuleBaseNode[] {
  const dataById = new Map<string, ModuleBaseNodeData>();

  storedNodes.forEach((node) => {
    dataById.set(node.id, {
      id: node.id,
      name: node.name,
      type: PageType.NeuralBlueprint,
      kind: node.kind,
      predecessors: [],
      successors: [],
      forwardTopologyOrder: node.forwardTopologyOrder,
      backwardTopologyOrder: node.backwardTopologyOrder,
      normalizationMode: node.kind === 'Input' ? node.normalizationMode ?? '0-1' : undefined,
      initializationMode: node.kind === 'Linear' ? node.initializationMode ?? 'normal' : undefined,
      biasInitializationMode: node.kind === 'Linear' ? node.biasInitializationMode ?? 'zeros' : undefined,
      rankStats: {
        rank: node.outputDim,
        effectiveRank: node.kind === 'Input' ? node.effectiveRank ?? node.outputDim : node.outputDim,
        saturation: 0,
      },
      varianceStats: node.varianceStats,
      position: node.position,
    });
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
    data: dataById.get(node.id) as ModuleBaseNodeData,
    draggable: true,
    selectable: true,
  }));
}

function toStoredNode(node: ModuleBaseNode): StoredModuleBaseNode {
  return {
    id: node.id,
    name: node.data.name,
    kind: node.data.kind,
    position: node.position,
    forwardTopologyOrder: node.data.forwardTopologyOrder,
    backwardTopologyOrder: node.data.backwardTopologyOrder,
    outputDim: node.data.rankStats?.rank ?? 64,
    effectiveRank: node.data.kind === 'Input' ? node.data.rankStats?.effectiveRank ?? 64 : undefined,
    varianceStats: node.data.varianceStats,
    normalizationMode: node.data.kind === 'Input' ? node.data.normalizationMode ?? '0-1' : undefined,
    initializationMode: node.data.kind === 'Linear' ? node.data.initializationMode ?? 'normal' : undefined,
    biasInitializationMode: node.data.kind === 'Linear' ? node.data.biasInitializationMode ?? 'zeros' : undefined,
  };
}
