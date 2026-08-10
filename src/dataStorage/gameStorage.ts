import { createInitialGameProgress } from '../game/gameProgress';
import type { GameProgress } from '../game/gameTypes';
import { appStorage } from './storageAdapter';

const GAME_PROGRESS_STORAGE_KEY = 'neural-blueprint:game-progress:v2';

export function loadGameProgress(): GameProgress {
  const raw = appStorage.getItem(GAME_PROGRESS_STORAGE_KEY);
  if (raw) return JSON.parse(raw) as GameProgress;

  const progress = createInitialGameProgress();
  saveGameProgress(progress);
  return progress;
}

export function saveGameProgress(progress: GameProgress): void {
  appStorage.setItem(GAME_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function clearGameProgress(): void {
  appStorage.removeItem(GAME_PROGRESS_STORAGE_KEY);
}
