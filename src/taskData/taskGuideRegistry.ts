import { guideTask1 } from './configs/task1';
import type { TaskGuideConfig } from './taskGuideTypes';

const TASK_GUIDE_CONFIGS: Record<string, TaskGuideConfig> = {
  'task1:welcome to neural blueprint': guideTask1,
};

export function getTaskGuideConfig(
  fileId: string,
): TaskGuideConfig | undefined {
  return TASK_GUIDE_CONFIGS[fileId];
}
