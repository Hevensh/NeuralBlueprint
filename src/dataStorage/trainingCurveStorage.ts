import type { KnowledgeLossPoint } from '../blueprint/knowledgeGraph/model/types';
import { appStorage } from './storageAdapter';

const STORAGE_PREFIX = 'trainingCurves:v2:';

export type TrainingCurveSnapshot = {
  id: string;
  createdAt: string;
  epoch: number;
  history: KnowledgeLossPoint[];
  graphGeneration: {
    minNodes: number;
    maxNodes: number;
    datasetCount: number;
    seed: string;
  };
  networkCapability: {
    memoryPoints: number;
    reasoningPoints: number;
    seed: string;
  };
};

export function loadTrainingCurves(fileId: string) {
  const raw = appStorage.getItem(`${STORAGE_PREFIX}${fileId}`);
  return raw ? JSON.parse(raw) as TrainingCurveSnapshot[] : [];
}

export function saveTrainingCurves(
  fileId: string,
  snapshots: TrainingCurveSnapshot[],
) {
  appStorage.setItem(`${STORAGE_PREFIX}${fileId}`, JSON.stringify(snapshots));
}
