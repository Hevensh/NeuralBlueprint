import type { KnowledgeDatasetCollection } from '../blueprint/knowledgeGraph/model/datasetSplit';
import type {
  KnowledgeEdge,
  KnowledgeEdgeKind,
  KnowledgeGraphDefinition,
  KnowledgeGraphMemory,
  KnowledgeLossPoint,
  KnowledgeNode,
} from '../blueprint/knowledgeGraph/model/types';
import { appStorage } from './storageAdapter';

const STORAGE_PREFIX = 'knowledgeGraph:v13:';

export type KnowledgeGraphSessionState = {
  graphDefinition: KnowledgeGraphDefinition;
  memory: KnowledgeGraphMemory;
  epoch: number;
  lossHistory: KnowledgeLossPoint[];
  viewport?: KnowledgeGraphViewport;
  graphControls: KnowledgeGraphControlState;
  trainingControls: TrainingControlState;
  datasetCollection: KnowledgeDatasetCollection;
  trainingRandomState: number;
  modelInitialized: boolean;
  networkProfileSignature: string;
  ui: KnowledgeGraphUiState;
};

export type KnowledgeGraphUiState = {
  showMemory: boolean;
  showMetrics: boolean;
  showUtility: boolean;
  showReceptiveField: boolean;
  showDistanceIndex: boolean;
};

export const DEFAULT_KNOWLEDGE_GRAPH_UI: KnowledgeGraphUiState = {
  showMemory: true,
  showMetrics: true,
  showUtility: true,
  showReceptiveField: false,
  showDistanceIndex: false,
};

export type KnowledgeGraphViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type TrainingControlState = {
  learningRate: number;
  regularizationRate: number;
  trainSteps: number;
  initializationSeed: string;
};

export type KnowledgeGraphControlState = {
  minNodes: number;
  maxNodes: number;
  datasetCount: number;
  generationSeed: string;
};

type StoredKnowledgeEdge<Kind extends KnowledgeEdgeKind> = {
  kind: Kind;
  id: string;
  sourceId: string;
  targetId: string;
  properties: KnowledgeEdge<Kind>['properties'];
};

type StoredKnowledgeGraphDefinition = {
  nodes: Record<string, KnowledgeNode>;
  depEdges: StoredKnowledgeEdge<'dependency'>[];
  subEdges: StoredKnowledgeEdge<'substitute'>[];
  interEdges: StoredKnowledgeEdge<'interference'>[];
};

type StoredKnowledgeGraphSessionState = Omit<
  KnowledgeGraphSessionState,
  'graphDefinition' | 'ui'
> & {
  graphDefinition: StoredKnowledgeGraphDefinition;
  ui?: Partial<KnowledgeGraphUiState>;
};

export function loadKnowledgeGraphSession(
  fileId: string,
): KnowledgeGraphSessionState | null {
  const raw = appStorage.getItem(`${STORAGE_PREFIX}${fileId}`);
  if (!raw) return null;

  const stored = JSON.parse(raw) as StoredKnowledgeGraphSessionState;
  return {
    ...stored,
    graphDefinition: toRuntimeGraph(stored.graphDefinition),
    ui: {
      ...DEFAULT_KNOWLEDGE_GRAPH_UI,
      ...stored.ui,
    },
  };
}

export function saveKnowledgeGraphSession(
  fileId: string,
  state: KnowledgeGraphSessionState,
): void {
  const stored: StoredKnowledgeGraphSessionState = {
    ...state,
    graphDefinition: toStoredGraph(state.graphDefinition),
  };
  appStorage.setItem(`${STORAGE_PREFIX}${fileId}`, JSON.stringify(stored));
}

export function clearKnowledgeGraphSession(fileId: string): void {
  appStorage.removeItem(`${STORAGE_PREFIX}${fileId}`);
}

function toStoredGraph(
  graph: KnowledgeGraphDefinition,
): StoredKnowledgeGraphDefinition {
  return {
    nodes: graph.nodes,
    depEdges: graph.depEdges.map(toStoredEdge),
    subEdges: graph.subEdges.map(toStoredEdge),
    interEdges: graph.interEdges.map(toStoredEdge),
  };
}

function toStoredEdge<Kind extends KnowledgeEdgeKind>(
  edge: KnowledgeEdge<Kind>,
): StoredKnowledgeEdge<Kind> {
  return {
    kind: edge.kind,
    id: edge.id,
    sourceId: edge.source.id,
    targetId: edge.target.id,
    properties: edge.properties,
  };
}

function toRuntimeGraph(
  graph: StoredKnowledgeGraphDefinition,
): KnowledgeGraphDefinition {
  return {
    nodes: graph.nodes,
    depEdges: graph.depEdges.flatMap((edge) => (
      toRuntimeEdge(edge, graph.nodes) ?? []
    )),
    subEdges: graph.subEdges.flatMap((edge) => (
      toRuntimeEdge(edge, graph.nodes) ?? []
    )),
    interEdges: graph.interEdges.flatMap((edge) => (
      toRuntimeEdge(edge, graph.nodes) ?? []
    )),
  };
}

function toRuntimeEdge<Kind extends KnowledgeEdgeKind>(
  edge: StoredKnowledgeEdge<Kind>,
  nodes: Record<string, KnowledgeNode>,
): KnowledgeEdge<Kind> | null {
  const source = nodes[edge.sourceId];
  const target = nodes[edge.targetId];
  if (!source || !target) return null;

  return {
    kind: edge.kind,
    id: edge.id,
    source,
    target,
    properties: edge.properties,
  };
}
