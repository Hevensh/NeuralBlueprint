import { appStorage } from './storageAdapter';

const APP_SETTINGS_STORAGE_KEY = 'neural-blueprint:settings:v1';

export interface AppSettings {
  waitForTraining: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  waitForTraining: true,
};

export function loadAppSettings(): AppSettings {
  const raw = appStorage.getItem(APP_SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_APP_SETTINGS;

  const stored = JSON.parse(raw) as Partial<AppSettings>;
  return {
    waitForTraining: typeof stored.waitForTraining === 'boolean'
      ? stored.waitForTraining
      : DEFAULT_APP_SETTINGS.waitForTraining,
  };
}

export function saveAppSettings(settings: AppSettings) {
  appStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
