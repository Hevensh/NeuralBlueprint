import type { KnowledgeGraphSessionState } from '../dataStorage/knowledgeGraphStorage';
import {
  generateKnowledgeDatasets,
  type DatasetSplitRatio,
} from '../blueprint/knowledgeGraph/model/datasetSplit';
import { generateRandomKnowledgeGraph } from '../blueprint/knowledgeGraph/model/graphGenerator';
import { createKnowledgeGraphMemory } from '../blueprint/knowledgeGraph/model/memoryState';
import { createTrainingRandomState } from '../blueprint/knowledgeGraph/model/trainingSimulation';

export const DEFAULT_DATASET_SPLIT_RATIO: DatasetSplitRatio = {
  train: 4,
  val: 1,
  test: 0,
};

export const DEFAULT_GRAPH_CONTROLS = {
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

export function createDefaultKnowledgeGraphSession(): KnowledgeGraphSessionState {
  const graphDefinition = generateRandomKnowledgeGraph({
    minNodes: DEFAULT_GRAPH_CONTROLS.minNodes,
    maxNodes: DEFAULT_GRAPH_CONTROLS.maxNodes,
    seed: DEFAULT_GRAPH_CONTROLS.generationSeed,
  });
  const memory = createKnowledgeGraphMemory(
    graphDefinition,
    DEFAULT_NETWORK_CAPABILITY.memory,
    DEFAULT_NETWORK_CAPABILITY.reasoning,
  );

  return {
    graphDefinition,
    memory,
    epoch: 0,
    lossHistory: [],
    datasetCollection: generateKnowledgeDatasets(
      graphDefinition,
      DEFAULT_GRAPH_CONTROLS.datasetCount,
      DEFAULT_GRAPH_CONTROLS.generationSeed,
      DEFAULT_DATASET_SPLIT_RATIO,
    ),
    graphControls: DEFAULT_GRAPH_CONTROLS,
    trainingControls: {
      learningRate: DEFAULT_TRAINING_CONTROLS.learningRate,
      regularizationRate: DEFAULT_TRAINING_CONTROLS.regularizationRate,
      trainSteps: DEFAULT_TRAINING_CONTROLS.trainSteps,
      initializationSeed: DEFAULT_NETWORK_CAPABILITY.initializationSeed,
    },
    trainingRandomState: createTrainingRandomState(
      DEFAULT_NETWORK_CAPABILITY.initializationSeed,
    ),
  };
}
