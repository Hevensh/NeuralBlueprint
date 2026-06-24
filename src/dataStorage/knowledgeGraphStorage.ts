import type { KnowledgeDatasetCollection } from '../blueprint/knowledgeGraph/model/datasetSplit';
import type {
  KnowledgeGraphDefinition,
  KnowledgeGraphMemory,
  KnowledgeLossPoint,
} from '../blueprint/knowledgeGraph/model/types';
import { appStorage } from './storageAdapter';

const STORAGE_PREFIX = 'knowledgeGraph:v10:';

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

export function loadKnowledgeGraphSession(
  fileId: string,
): KnowledgeGraphSessionState | null {
  const raw = appStorage.getItem(`${STORAGE_PREFIX}${fileId}`);
  return raw ? JSON.parse(raw) as KnowledgeGraphSessionState : null;
}

export function saveKnowledgeGraphSession(
  fileId: string,
  state: KnowledgeGraphSessionState,
): void {
  appStorage.setItem(`${STORAGE_PREFIX}${fileId}`, JSON.stringify(state));
}
