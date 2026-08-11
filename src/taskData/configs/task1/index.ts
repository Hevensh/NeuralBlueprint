import { PageType } from '../../../blueprint/PageTypes';
import type { AppLanguage } from '../../../i18n/labels';
import type { BlueprintTaskFeatureConfig } from '../../blueprintFeatureConfig';
import type { TaskFileConfig } from '../../taskFileTypes';
import type { TaskGuideConfig } from '../../taskGuideTypes';
import {
  createTask1GuideTextEn,
  type Task1GuideText,
} from './task1.en';
import { renderTask1LinearRegressionDiagram } from './diagrams/linearRegressionDiagram';
import { createTask1GuideTextZh } from './task1.zh';

const TASK1_INPUT_OUTPUT_DIM = 32;
const TASK1_INPUT_EFFECTIVE_RANK = 32;
const TASK1_OUTPUT_DIM = 2;
const TASK1_TRAIN_EPOCHS = 100;

export const configFileTask1: BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: ['Linear'],
    showBackwardAnalysisControl: true,
    showVarianceAnalysisToggle: true,
    showRankAnalysisToggle: true,
  },
  knowledgeGraph: {
    canOpenTab: true,
    showKnowledgeGraphControls: true,
    networkCapabilityMode: 'blueprint',
    showAllocationButtons: true,
    enableMemoryAnalysis: true,
    enableMasteryOverfitAnalysis: true,
    enableUtilityAnalysis: true,
    enableGlobalDebugPreview: true,
  },
};

export const configTask1: TaskFileConfig = {
  seed: '42',
  neuralBlueprint: {
    nodes: [
      {
        id: 'task1_input',
        kind: 'Input',
        position: { x: 0, y: 0 },
        outFeatures: TASK1_INPUT_OUTPUT_DIM,
        inputEffectiveRank: TASK1_INPUT_EFFECTIVE_RANK,
        normalizationMode: '0-1',
        lockedProperties: ['outFeatures', 'inputEffectiveRank'],
        deletable: false,
      },
      {
        id: 'task1_output',
        kind: 'Output',
        position: { x: 3, y: 0 },
        neededOutputDim: TASK1_OUTPUT_DIM,
        lockedProperties: ['neededOutputDim'],
        deletable: false,
      },
    ],
  },
  knowledgeGraph: {
    nodes: [
      {
        id: 'welcome_node',
        position: { x: 0, y: 0 },
      },
    ],
    datasets: [
      {
        nodeDataAmounts: {
          welcome_node: 90,
        },
      },
    ],
  },
};

export function createGuideTask1(language: AppLanguage): TaskGuideConfig {
  const text = createTask1GuideText(language);

  return {
    id: 'task1-guide',
    title: text.title,
    completionInfo: text.completionInfo,
    steps: [
      {
        id: 'add-linear',
        workspace: PageType.NeuralBlueprint,
        title: text.steps.addLinear.title,
        description: text.steps.addLinear.description,
        hint: text.steps.addLinear.hint,
        info: {
          ...text.steps.addLinear.info,
          illustration: renderTask1LinearRegressionDiagram,
        },
        animation: {
          target: 'module-card-Linear',
          placement: 'right',
          demo: {
            type: 'drag',
            fromTarget: 'module-card-Linear',
            toTarget: 'neural-blueprint-canvas',
            toOffset: { x: 0, y: -1 },
            label: text.steps.addLinear.dragLabel,
            path: 'straight',
          },
        },
        completeWhen: {
          type: 'moduleNodeExists',
          selector: { kind: 'Linear' },
        },
      },
      {
        id: 'connect-network',
        workspace: PageType.NeuralBlueprint,
        title: text.steps.connectNetwork.title,
        description: text.steps.connectNetwork.description,
        hint: text.steps.connectNetwork.hint,
        info: text.steps.connectNetwork.info,
        animation: [
          {
            title: text.steps.connectNetwork.connectInput.title,
            hint: text.steps.connectNetwork.connectInput.hint,
            selector: '[data-guide-node-kind="Linear"]',
            placement: 'left',
            demo: {
              type: 'connect',
              segments: [
                {
                  fromSelector: '[data-guide-target="module-node-task1_input"] .output-handle',
                  toSelector: '[data-guide-node-kind="Linear"] .input-handle',
                },
              ],
            },
            completeWhen: {
              type: 'moduleReachabilityExists',
              from: { id: 'task1_input' },
              to: { kind: 'Linear' },
            },
          },
          {
            title: text.steps.connectNetwork.connectOutput.title,
            hint: text.steps.connectNetwork.connectOutput.hint,
            target: 'module-node-task1_output',
            placement: 'left',
            demo: {
              type: 'connect',
              segments: [
                {
                  fromSelector: '[data-guide-node-kind="Linear"] .output-handle',
                  toSelector: '[data-guide-target="module-node-task1_output"] .input-handle',
                },
              ],
            },
          },
        ],
        completeWhen: {
          type: 'moduleReachabilityExists',
          from: { id: 'task1_input' },
          to: { id: 'task1_output' },
          via: { kind: 'Linear' },
        },
      },
      {
        id: 'set-linear-output',
        workspace: PageType.NeuralBlueprint,
        title: text.steps.setLinearOutput.title,
        description: text.steps.setLinearOutput.description,
        hint: text.steps.setLinearOutput.hint,
        info: text.steps.setLinearOutput.info,
        animation: [
          {
            title: text.steps.setLinearOutput.selectLinear.title,
            hint: text.steps.setLinearOutput.selectLinear.hint,
            selector: '[data-guide-node-kind="Linear"][data-guide-successor-ids~="task1_output"]',
            placement: 'left',
            completeWhen: {
              type: 'selectedModuleNode',
              selector: {
                kind: 'Linear',
                successorId: 'task1_output',
              },
            },
          },
          {
            target: 'property-output-dim',
            placement: 'left',
          },
        ],
        completeWhen: {
          type: 'moduleNodeExists',
          selector: {
            id: 'task1_output',
            stats: { status: 'valid' },
          },
        },
      },
      {
        id: 'initialize-network',
        workspace: PageType.TrainingProcess,
        title: text.steps.initializeNetwork.title,
        description: text.steps.initializeNetwork.description,
        hint: text.steps.initializeNetwork.hint,
        info: text.steps.initializeNetwork.info,
        animation: [
          {
            title: text.steps.initializeNetwork.openTraining.title,
            hint: text.steps.initializeNetwork.openTraining.hint,
            target: 'workspace-tab-trainingProcess',
            placement: 'bottom',
            completeWhen: {
              type: 'activeWorkspace',
              workspace: PageType.TrainingProcess,
            },
          },
          {
            target: 'training-initialize-model',
            placement: 'right',
          },
        ],
        completeWhen: {
          type: 'trainingFlag',
          flag: 'modelInitialized',
        },
      },
      {
        id: 'train-100-epochs',
        workspace: PageType.TrainingProcess,
        title: text.steps.trainEpochs.title,
        description: text.steps.trainEpochs.description,
        hint: text.steps.trainEpochs.hint,
        info: text.steps.trainEpochs.info,
        animation: [
          {
            title: text.steps.trainEpochs.openTraining.title,
            hint: text.steps.trainEpochs.openTraining.hint,
            target: 'workspace-tab-trainingProcess',
            placement: 'bottom',
            completeWhen: {
              type: 'activeWorkspace',
              workspace: PageType.TrainingProcess,
            },
          },
          {
            title: text.steps.trainEpochs.setTrainSteps.title,
            hint: text.steps.trainEpochs.setTrainSteps.hint,
            target: 'training-train-steps',
            placement: 'right',
            completeWhen: {
              type: 'trainingStat',
              stat: 'trainSteps',
              min: TASK1_TRAIN_EPOCHS,
            },
          },
          {
            title: text.steps.trainEpochs.train.title,
            hint: text.steps.trainEpochs.train.hint,
            target: 'training-train-button',
            placement: 'right',
          },
        ],
        completeWhen: {
          type: 'trainingStat',
          stat: 'epoch',
          min: TASK1_TRAIN_EPOCHS,
        },
      },
    ],
  };
}

function createTask1GuideText(language: AppLanguage): Task1GuideText {
  const values = {
    outputDim: TASK1_OUTPUT_DIM,
    trainEpochs: TASK1_TRAIN_EPOCHS,
  };

  return language === 'zh'
    ? createTask1GuideTextZh(values)
    : createTask1GuideTextEn(values);
}
