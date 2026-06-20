import { appStorage } from '../../../dataStorage/storageAdapter';
import type { KnowledgeDatasetCollection } from './datasetSplit';
import type { KnowledgeGraph, MasterGraph } from './types';

const STORAGE_PREFIX = 'knowledgeGraph:v2:';

export type KnowledgeNetworkState = {
  graph: KnowledgeGraph;
  master: MasterGraph;
  epoch: number;
  lossHistory: KnowledgeLossPoint[];
  viewport?: KnowledgeGraphViewport;
  initialization?: TrainingInitializationState;
  graphControls: KnowledgeGraphControlState;
  trainingControls: TrainingControlState;
  datasetCollection: KnowledgeDatasetCollection;
  generationSeed: string;
  trainingRandomState: number;
};

export type KnowledgeGraphViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type KnowledgeLossPoint = {
  epoch: number;
  trainLoss: number;
  valLoss: number | null;
};

export type TrainingInitializationState = {
  availableMemoryPoints: number;
  availableReasoningPoints: number;
  modelStabilityPercent: number;
  learningRate?: number;
  regularizationRate?: number;
  initializationSeed?: string;
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

export function loadKnowledgeNetworkState(
  fileId: string,
): KnowledgeNetworkState | null {
  const raw = appStorage.getItem(`${STORAGE_PREFIX}${fileId}`);
  return raw ? JSON.parse(raw) as KnowledgeNetworkState : null;
}

export function saveKnowledgeNetworkState(
  fileId: string,
  state: KnowledgeNetworkState,
): void {
  appStorage.setItem(`${STORAGE_PREFIX}${fileId}`, JSON.stringify(state));
}
