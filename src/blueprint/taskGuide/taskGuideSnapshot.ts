import type { Edge } from '@xyflow/react';
import type { PageType } from '../PageTypes';
import type { InferenceMemoryProfile } from '../InferenceMemoryProfileTypes';
import type {
  ModuleBaseNode,
  ModuleBaseNodeKind,
} from '../neuralBlueprint/ModuleBaseNodeTypes';
import { buildInferenceMemoryProfile } from '../neuralBlueprint/analysis/inferenceMemoryProfile';
import { createGraphSnapshot } from '../neuralBlueprint/utils/graphSnapshot';

export interface TaskRuntimeSnapshot {
  activeWorkspace: PageType;
  visitedWorkspaces: PageType[];
  neuralBlueprint?: NeuralBlueprintTaskSnapshot;
  trainingProcess?: TrainingProcessTaskSnapshot;
}

export interface NeuralBlueprintTaskSnapshot {
  nodes: ModuleBaseNode[];
  edges: Edge[];
  selectedNodeId?: string | null;
  nodeCount: number;
  edgeCount: number;
  moduleCounts: Record<ModuleBaseNodeKind, number>;
  totalMemoryPoint: number;
  totalInferencePoint: number;
  maxInferenceStage: number;
  inferenceMemoryProfile: InferenceMemoryProfile;
}

export interface TrainingProcessTaskSnapshot {
  modelInitialized: boolean;
  epoch: number;
  trainSteps: number;
  savedCurveCount?: number;
  bestValLoss?: number;
  savedBestValLoss?: number;
}

const MODULE_KINDS: ModuleBaseNodeKind[] = [
  'Input',
  '3DInput',
  'Linear',
  'CNN',
  'Pooling',
  'Flatten',
  'GlobalPooling',
  'ReLU',
  'Dropout',
  'Sum',
  'Output',
];

export function createNeuralBlueprintTaskSnapshot(
  nodes: ModuleBaseNode[],
  edges: Edge[],
  selectedNodeId?: string | null,
): NeuralBlueprintTaskSnapshot {
  const graph = createGraphSnapshot(nodes, edges);

  return {
    ...graph,
    selectedNodeId,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    moduleCounts: countModuleKinds(graph.nodes),
    totalMemoryPoint: sumNodeNumber(graph.nodes, 'memoryPoint'),
    totalInferencePoint: sumNodeNumber(graph.nodes, 'inferencePoint'),
    maxInferenceStage: getMaxInferenceStage(graph.nodes),
    inferenceMemoryProfile: buildInferenceMemoryProfile(graph.nodes),
  };
}

function countModuleKinds(
  nodes: ModuleBaseNode[],
): Record<ModuleBaseNodeKind, number> {
  const counts = Object.fromEntries(
    MODULE_KINDS.map((kind) => [kind, 0]),
  ) as Record<ModuleBaseNodeKind, number>;

  nodes.forEach((node) => {
    counts[node.data.kind] += 1;
  });

  return counts;
}

function sumNodeNumber(
  nodes: ModuleBaseNode[],
  field: 'memoryPoint' | 'inferencePoint',
) {
  return nodes.reduce((sum, node) => {
    const value = node.data[field];
    return Number.isFinite(value) ? sum + (value as number) : sum;
  }, 0);
}

function getMaxInferenceStage(nodes: ModuleBaseNode[]) {
  return nodes.reduce((maxStage, node) => {
    const stages = node.data.inferenceTopologyOrder;
    if (!stages?.size) return maxStage;

    return Math.max(maxStage, ...stages);
  }, 0);
}
