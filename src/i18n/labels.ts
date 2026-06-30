import type { DesktopFileType } from '../desktop/desktopTypes';
import { EN_LABELS, type AppLabelSet } from './label.en';
import { ZH_LABELS } from './label.zh';

export type AppLanguage = 'en' | 'zh';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export const LANGUAGE_OPTIONS: Array<{
  label: string;
  value: AppLanguage;
}> = [
  { label: 'English', value: 'en' },
  { label: '中文', value: 'zh' },
];

export const UI_LABELS: Record<AppLanguage, AppLabelSet> = {
  en: EN_LABELS,
  zh: ZH_LABELS,
};

export function getDesktopFileTypeLabels(
  language: AppLanguage,
  type: DesktopFileType,
) {
  return UI_LABELS[language].desktop.fileTypes[type];
}
