import { appStorage } from '../dataStorage/storageAdapter';
import { DEFAULT_LANGUAGE, type AppLanguage } from './labels';

const LANGUAGE_STORAGE_KEY = 'settings:language';

export function loadAppLanguage(): AppLanguage {
  const value = appStorage.getItem(LANGUAGE_STORAGE_KEY);
  return value === 'zh' || value === 'en' ? value : DEFAULT_LANGUAGE;
}

export function saveAppLanguage(language: AppLanguage): void {
  appStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}
