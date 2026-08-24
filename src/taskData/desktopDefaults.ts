import type {
  DesktopFile,
  DesktopFileDefinition,
} from '../desktop/desktopTypes';
import {
  configFileCnnScaleExperiment,
  configFileTask1,
  configFileTask2,
  configFileTask3,
  configFileTask4,
} from './configs';

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
    id: 'cnn_scale12_baseline',
    name: 'CNN Scale: 3x3 Baseline',
    localizedNames: {
      en: 'CNN Scale: 3x3 Baseline',
      zh: 'CNN 尺度：3x3 基线',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 0, y: 2 },
    config: configFileCnnScaleExperiment,
  },
  {
    id: 'cnn_scale12_multisize',
    name: 'CNN Scale: Multi-size',
    localizedNames: {
      en: 'CNN Scale: Multi-size',
      zh: 'CNN 尺度：多尺寸',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 1, y: 2 },
    config: configFileCnnScaleExperiment,
  },
  {
    id: 'task3_cifar_scratch',
    name: 'Task 3A: CIFAR-10 ResNet-18 (Scratch)',
    localizedNames: {
      en: 'Task 3A: CIFAR-10 ResNet-18 (Scratch)',
      zh: '任务 3A：CIFAR-10 ResNet-18（从头训练）',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 3, y: 1 },
    config: configFileTask3,
  },
  {
    id: 'task3_cifar_pretrained',
    name: 'Task 3B: CIFAR-10 ResNet-18 (Pretrained)',
    localizedNames: {
      en: 'Task 3B: CIFAR-10 ResNet-18 (Pretrained)',
      zh: '任务 3B：CIFAR-10 ResNet-18（预训练）',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 4, y: 1 },
    config: configFileTask3,
  },
  {
    id: 'task4_mobilenet_scratch',
    name: 'Task 4A: CIFAR-10 MobileNet (Standard)',
    localizedNames: {
      en: 'Task 4A: CIFAR-10 MobileNet (Standard)',
      zh: '任务 4A：CIFAR-10 MobileNet（标准）',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 5, y: 1 },
    config: configFileTask4,
  },
  {
    id: 'task4_mobilenet_multiscale',
    name: 'Task 4B: CIFAR-10 MobileNet (Multi-scale)',
    localizedNames: {
      en: 'Task 4B: CIFAR-10 MobileNet (Multi-scale)',
      zh: '任务 4B：CIFAR-10 MobileNet（多尺度）',
    },
    type: 'nbp',
    deletable: false,
    visible: true,
    dependencyFileIds: [],
    initialPosition: { x: 6, y: 1 },
    config: configFileTask4,
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
