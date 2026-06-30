import type { AppLanguage } from '../i18n/labels';
import { TASK_GUIDE_CONFIGS } from './configs';
import type { TaskGuideConfig } from './taskGuideTypes';

export function getTaskGuideConfig(
  fileId: string,
  language: AppLanguage,
): TaskGuideConfig | undefined {
  return TASK_GUIDE_CONFIGS[fileId]?.(language);
}
