import type { AppLanguage } from '../../i18n/labels';
import type { TaskFileConfig } from '../taskFileTypes';
import type { TaskGuideConfig } from '../taskGuideTypes';
import {
  configFileTask1,
  configTask1,
  createGuideTask1,
} from './task1';
import {
  configFileTask2,
  configTask2,
  createGuideTask2,
} from './task2';

export { configFileTask1, configFileTask2 };

export const TASK_FILE_CONFIGS: Record<string, TaskFileConfig> = {
  task1: configTask1,
  task2: configTask2,
};

export const TASK_GUIDE_CONFIGS: Record<
  string,
  (language: AppLanguage) => TaskGuideConfig
> = {
  task1: createGuideTask1,
  task2: createGuideTask2,
};
