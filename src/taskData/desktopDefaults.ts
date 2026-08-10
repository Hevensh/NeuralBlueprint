import type {
  DesktopFile,
  DesktopFileDefinition,
} from '../desktop/desktopTypes';
import { configFileTask1, configFileTask2 } from './configs';

export const DESKTOP_FILE_DEFINITIONS: DesktopFileDefinition[] = [
  {
    id: 'experimental_nbp',
    name: 'Experimental Blueprint',
    localizedNames: {
      en: 'Experimental Blueprint',
      zh: '实验蓝图',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 0, y: 1 },
  },
  {
    id: 'task1',
    name: 'Task 1: Linear Regression',
    localizedNames: {
      en: 'Task 1: Linear Regression',
      zh: '任务 1：线性回归',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 1, y: 1 },
    config: configFileTask1,
  },
  {
    id: 'task2',
    name: 'Task 2: Nonlinear Regression',
    localizedNames: {
      en: 'Task 2: Nonlinear Regression',
      zh: '任务 2：非线性回归',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 2, y: 1 },
    config: configFileTask2,
  },
];

export function createInitialDesktopFiles(): DesktopFile[] {
  return DESKTOP_FILE_DEFINITIONS.map(createDesktopFileFromDefinition);
}

export function createDesktopFileFromDefinition(
  definition: DesktopFileDefinition,
): DesktopFile {
  const { initialPosition, ...file } = definition;
  return {
    ...file,
    position: initialPosition,
    completed: false,
    guideCompletedStepCount: 0,
  };
}
