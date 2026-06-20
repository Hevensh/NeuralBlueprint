import { appStorage } from '../../dataStorage/storageAdapter';
import type { KnowledgeLossPoint } from '../knowledgeGraph/model/knowledgeStorage';

const STORAGE_PREFIX = 'trainingCurves:v1:';

export type TrainingCurveSnapshot = {
  id: string;
  createdAt: string;
  epoch: number;
  history: KnowledgeLossPoint[];
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
