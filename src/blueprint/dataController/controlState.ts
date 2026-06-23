import type {
  KnowledgeGraphControlState,
  KnowledgeGraphSessionState,
  TrainingControlState,
} from '../knowledgeGraph/model/knowledgeStorage';
import type { DatasetSplitRatio } from '../knowledgeGraph/model/datasetSplit';

export const DEFAULT_DATASET_SPLIT_RATIO: DatasetSplitRatio = {
  train: 4,
  val: 1,
  test: 0,
};

export const DEFAULT_GRAPH_CONTROLS: KnowledgeGraphControlState = {
  minNodes: 12,
  maxNodes: 16,
  datasetCount: 4,
  generationSeed: '42',
};

export const DEFAULT_NETWORK_CAPABILITY = {
  memory: 1200,
  reasoning: 3,
  initializationSeed: '42',
};

export const DEFAULT_TRAINING_CONTROLS = {
  learningRate: -3,
  regularizationRate: -4,
  trainSteps: 10,
};

export function getControllerControls(state: KnowledgeGraphSessionState) {
  return {
    graph: state.graphControls,
    network: {
      memory: state.memory.availableMemoryPoints,
      reasoning: state.memory.availableReasoningPoints,
      initializationSeed: state.trainingControls.initializationSeed,
    },
    training: state.trainingControls,
  };
}

export function mergeGraphControls(
  current: KnowledgeGraphControlState,
  patch: Partial<KnowledgeGraphControlState>,
): KnowledgeGraphControlState {
  return { ...current, ...patch };
}

export function mergeTrainingControls(
  current: TrainingControlState,
  patch: Partial<TrainingControlState>,
): TrainingControlState {
  return { ...current, ...patch };
}

export type BlueprintControllerControls = ReturnType<
  typeof getControllerControls
>;
