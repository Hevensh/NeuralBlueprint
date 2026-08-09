import { DEFAULT_LAB_DAY_CONFIG } from '../lab/labNpcRegistry';
import { createInitialLabProgress } from '../lab/labProgress';
import type { LabProgress } from '../lab/labTypes';
import { appStorage } from './storageAdapter';

const LAB_PROGRESS_STORAGE_KEY = 'neural-blueprint:lab-progress:v3';

export function loadLabProgress(): LabProgress {
  const raw = appStorage.getItem(LAB_PROGRESS_STORAGE_KEY);
  if (raw) return JSON.parse(raw) as LabProgress;

  const progress = createInitialLabProgress(DEFAULT_LAB_DAY_CONFIG);
  saveLabProgress(progress);
  return progress;
}

export function saveLabProgress(progress: LabProgress): void {
  appStorage.setItem(LAB_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function clearLabProgress(): void {
  appStorage.removeItem(LAB_PROGRESS_STORAGE_KEY);
}
