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
import {
  configCnnScaleBaseline,
  configCnnScaleMultiSize,
  configFileCnnScaleExperiment,
} from './cnnScaleExperiments';
import {
  configFileTask3,
  configTask3Pretrained,
  configTask3Scratch,
} from './task3';

export {
  configFileCnnScaleExperiment,
  configFileTask1,
  configFileTask2,
  configFileTask3,
};

export const TASK_FILE_CONFIGS: Record<string, TaskFileConfig> = {
  task1: configTask1,
  task2: configTask2,
  cnn_scale12_baseline: configCnnScaleBaseline,
  cnn_scale12_multisize: configCnnScaleMultiSize,
  task3_cifar_scratch: configTask3Scratch,
  task3_cifar_pretrained: configTask3Pretrained,
};

export const TASK_GUIDE_CONFIGS: Record<
  string,
  (language: AppLanguage) => TaskGuideConfig
> = {
  task1: createGuideTask1,
  task2: createGuideTask2,
};
