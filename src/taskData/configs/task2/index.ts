import { PageType } from '../../../blueprint/PageTypes';
import type { AppLanguage } from '../../../i18n/labels';
import type { BlueprintTaskFeatureConfig } from '../../blueprintFeatureConfig';
import type { TaskFileConfig } from '../../taskFileTypes';
import type {
  TaskGuideCondition,
  TaskGuideConfig,
} from '../../taskGuideTypes';
import { renderTask2NonlinearLinearFitDiagram } from './diagrams/nonlinearLinearFitDiagram';
import { renderTask2NonlinearReluFitDiagram } from './diagrams/nonlinearReluFitDiagram';
import {
  createTask2GuideTextEn,
  type Task2GuideText,
} from './task2.en';
import { createTask2GuideTextZh } from './task2.zh';

const TASK2_INPUT_OUTPUT_DIM = 32;
const TASK2_INPUT_EFFECTIVE_RANK = 16;
const TASK2_OUTPUT_DIM = 2;
const TASK2_TRAIN_EPOCHS = 100;
const TASK2_RETRY_EPOCHS = 500;
const TASK2_TARGET_VAL_LOSS = 0.35;
const TASK2_TUNED_HIDDEN_DIM = 256;

export const configFileTask2: BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: ['Linear', 'ReLU'],
    showBackwardAnalysisControl: false,
    showVarianceAnalysisToggle: false,
    showRankAnalysisToggle: false,
    showRepetitionAnalysisToggle: false,
    showDistanceIndexAnalysisToggle: false,
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

export const configTask2: TaskFileConfig = {
  seed: '73',
  neuralBlueprint: {
    nodes: [
      {
        id: 'task2_input',
        kind: 'Input',
        position: { x: 0, y: 0 },
        outFeatures: TASK2_INPUT_OUTPUT_DIM,
        inputEffectiveRank: TASK2_INPUT_EFFECTIVE_RANK,
        normalizationMode: '0-1',
        lockedProperties: ['outFeatures', 'inputEffectiveRank'],
        deletable: false,
      },
      {
        id: 'task2_output',
        kind: 'Output',
        position: { x: 3, y: 0 },
        neededOutputDim: TASK2_OUTPUT_DIM,
        lockedProperties: ['neededOutputDim'],
        deletable: false,
      },
    ],
  },
  knowledgeGraph: {
    nodes: [
      {
        id: 'nonlinear_pattern',
        position: { x: 0, y: 0 },
      },
      {
        id: 'linear_feature',
        position: { x: 1, y: 0 },
      },
      {
        id: 'relu_breakpoint',
        position: { x: 2, y: 0 },
      },
      {
        id: 'hidden_width',
        position: { x: 1, y: 1 },
      },
      {
        id: 'validation_curve',
        position: { x: 2, y: 1 },
      },
    ],
    edges: [
      {
        kind: 'dependency',
        source: 'linear_feature',
        target: 'relu_breakpoint',
        requiredMemory: 16,
        lambda: 0.1,
        overfitCoefficient: 1,
        minimumInferenceStages: 0.2,
      },
    ],
    datasets: [
      {
        capacity: {
          optimalMemoryPoints: 440,
          undercapacityLossScale: 0.54,
          excessCapacityLossScale: 0.3,
        },
        nodeDataAmounts: {
          nonlinear_pattern: 140,
          linear_feature: 90,
          relu_breakpoint: 110,
          hidden_width: 80,
          validation_curve: 100,
        },
      },
    ],
  },
};

export function createGuideTask2(language: AppLanguage): TaskGuideConfig {
  const text = createTask2GuideText(language);
  const firstLinearExpandedCondition: TaskGuideCondition = {
    type: 'moduleNodeExists',
    selector: {
      kind: 'Linear',
      predecessorId: 'task2_input',
      minProps: { outFeatures: TASK2_TUNED_HIDDEN_DIM },
    },
  };
  const retryFailedCondition: TaskGuideCondition = {
    type: 'all',
    conditions: [
      {
        type: 'trainingStat',
        stat: 'epoch',
        min: TASK2_RETRY_EPOCHS,
      },
      {
        type: 'trainingStat',
        stat: 'bestValLoss',
        min: TASK2_TARGET_VAL_LOSS,
      },
    ],
  };
  const dimEditSatisfiedCondition: TaskGuideCondition = {
    type: 'all',
    conditions: [
      firstLinearExpandedCondition,
      {
        type: 'any',
        conditions: [
          {
            type: 'not',
            condition: retryFailedCondition,
          },
          {
            type: 'trainingFlag',
            flag: 'modelInitialized',
            value: false,
          },
        ],
      },
    ],
  };

  return {
    id: 'task2-guide',
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
          illustration: renderTask2NonlinearLinearFitDiagram,
        },
        animation: {
          target: 'module-card-Linear',
          placement: 'right',
          demo: {
            type: 'drag',
            fromTarget: 'module-card-Linear',
            toTarget: 'neural-blueprint-canvas',
            toOffset: { x: -1, y: -1 },
            label: text.steps.addLinear.dragLabel,
            path: 'straight',
          },
        },
        completeWhen: {
          type: 'moduleCount',
          kind: 'Linear',
          min: 1,
        },
      },
      {
        id: 'add-relu',
        workspace: PageType.NeuralBlueprint,
        title: text.steps.addRelu.title,
        description: text.steps.addRelu.description,
        hint: text.steps.addRelu.hint,
        info: {
          ...text.steps.addRelu.info,
          illustration: renderTask2NonlinearReluFitDiagram,
        },
        animation: {
          target: 'module-card-ReLU',
          placement: 'right',
          demo: {
            type: 'drag',
            fromTarget: 'module-card-ReLU',
            toTarget: 'neural-blueprint-canvas',
            toOffset: { x: 0, y: -1 },
            label: text.steps.addRelu.dragLabel,
            path: 'straight',
          },
        },
        completeWhen: {
          type: 'moduleCount',
          kind: 'ReLU',
          min: 1,
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
            title: text.steps.connectNetwork.addOutputLinear.title,
            hint: text.steps.connectNetwork.addOutputLinear.hint,
            target: 'module-card-Linear',
            placement: 'right',
            demo: {
              type: 'drag',
              fromTarget: 'module-card-Linear',
              toTarget: 'neural-blueprint-canvas',
              toOffset: { x: 1, y: -1 },
              label: text.steps.addLinear.dragLabel,
              path: 'straight',
            },
            completeWhen: {
              type: 'moduleCount',
              kind: 'Linear',
              min: 2,
            },
          },
          {
            title: text.steps.connectNetwork.connectInput.title,
            hint: text.steps.connectNetwork.connectInput.hint,
            target: 'module-node-task2_input',
            placement: 'left',
            demo: {
              type: 'connect',
              segments: [
                {
                  fromSelector: '[data-guide-target="module-node-task2_input"] .output-handle',
                  toSelector: '[data-guide-node-kind="Linear"] .input-handle',
                },
              ],
            },
            completeWhen: {
              type: 'moduleReachabilityExists',
              from: { id: 'task2_input' },
              to: { kind: 'Linear' },
            },
          },
          {
            title: text.steps.connectNetwork.connectRelu.title,
            hint: text.steps.connectNetwork.connectRelu.hint,
            selector: '[data-guide-node-kind="Linear"][data-guide-predecessor-ids~="task2_input"]',
            placement: 'left',
            demo: {
              type: 'connect',
              segments: [
                {
                  fromSelector: '[data-guide-node-kind="Linear"][data-guide-predecessor-ids~="task2_input"] .output-handle',
                  toSelector: '[data-guide-node-kind="ReLU"] .input-handle',
                },
              ],
            },
            completeWhen: {
              type: 'moduleReachabilityExists',
              from: { id: 'task2_input' },
              to: { kind: 'ReLU' },
              via: { kind: 'Linear' },
            },
          },
          {
            title: text.steps.connectNetwork.connectOutputLinear.title,
            hint: text.steps.connectNetwork.connectOutputLinear.hint,
            selector: '[data-guide-node-kind="ReLU"]',
            placement: 'left',
            demo: {
              type: 'connect',
              segments: [
                {
                  fromSelector: '[data-guide-node-kind="ReLU"] .output-handle',
                  toSelector: '[data-guide-node-kind="Linear"]:not([data-guide-predecessor-ids~="task2_input"]) .input-handle',
                },
              ],
            },
            completeWhen: {
              type: 'modulePathExists',
              chain: [
                { kind: 'ReLU' },
                { kind: 'Linear' },
              ],
            },
          },
          {
            title: text.steps.connectNetwork.connectOutput.title,
            hint: text.steps.connectNetwork.connectOutput.hint,
            selector: '[data-guide-node-kind="Linear"]:not([data-guide-predecessor-ids~="task2_input"])',
            placement: 'left',
            demo: {
              type: 'connect',
              segments: [
                {
                  fromSelector: '[data-guide-node-kind="Linear"]:not([data-guide-predecessor-ids~="task2_input"]) .output-handle',
                  toSelector: '[data-guide-target="module-node-task2_output"] .input-handle',
                },
              ],
            },
            completeWhen: {
              type: 'modulePathExists',
              chain: [
                { kind: 'ReLU' },
                { kind: 'Linear' },
                { id: 'task2_output' },
              ],
            },
          },
          {
            title: text.steps.connectNetwork.selectOutputLinear.title,
            hint: text.steps.connectNetwork.selectOutputLinear.hint,
            selector: '[data-guide-node-kind="Linear"][data-guide-successor-ids~="task2_output"]',
            placement: 'left',
            completeWhen: {
              type: 'selectedModuleNode',
              selector: {
                kind: 'Linear',
                predecessorKind: 'ReLU',
                successorId: 'task2_output',
              },
            },
          },
          {
            title: text.steps.connectNetwork.setOutputDim.title,
            hint: text.steps.connectNetwork.setOutputDim.hint,
            target: 'property-output-dim',
            placement: 'left',
            completeWhen: {
              type: 'moduleNodeExists',
              selector: {
                kind: 'Linear',
                predecessorKind: 'ReLU',
                successorId: 'task2_output',
                props: { outFeatures: TASK2_OUTPUT_DIM },
              },
            },
          },
        ],
        completeWhen: {
          type: 'modulePathExists',
          chain: [
            { id: 'task2_input' },
            { kind: 'Linear' },
            { kind: 'ReLU' },
            { kind: 'Linear' },
            { id: 'task2_output', stats: { status: 'valid' } },
          ],
        },
      },
      {
        id: 'train-and-save',
        workspace: PageType.TrainingProcess,
        title: text.steps.trainAndSave.title,
        description: text.steps.trainAndSave.description,
        hint: text.steps.trainAndSave.hint,
        info: text.steps.trainAndSave.info,
        animation: [
          {
            title: text.steps.trainAndSave.openTraining.title,
            hint: text.steps.trainAndSave.openTraining.hint,
            target: 'workspace-tab-trainingProcess',
            placement: 'bottom',
            completeWhen: {
              type: 'activeWorkspace',
              workspace: PageType.TrainingProcess,
            },
          },
          {
            title: text.steps.trainAndSave.initializeNetwork.title,
            hint: text.steps.trainAndSave.initializeNetwork.hint,
            target: 'training-initialize-model',
            placement: 'right',
            completeWhen: {
              type: 'trainingFlag',
              flag: 'modelInitialized',
            },
          },
          {
            title: text.steps.trainAndSave.setTrainEpochs.title,
            hint: text.steps.trainAndSave.setTrainEpochs.hint,
            target: 'training-train-epochs',
            placement: 'right',
            completeWhen: {
              type: 'trainingStat',
              stat: 'trainEpochs',
              min: TASK2_TRAIN_EPOCHS,
            },
          },
          {
            title: text.steps.trainAndSave.train.title,
            hint: text.steps.trainAndSave.train.hint,
            target: 'training-train-button',
            placement: 'right',
            completeWhen: {
              type: 'trainingStat',
              stat: 'epoch',
              min: TASK2_TRAIN_EPOCHS,
            },
          },
          {
            title: text.steps.trainAndSave.save.title,
            hint: text.steps.trainAndSave.save.hint,
            selector: '.training-curve-storage .action-button:not(.primary)',
            placement: 'left',
          },
        ],
        completeWhen: {
          type: 'trainingStat',
          stat: 'savedCurveCount',
          min: 1,
        },
      },
      {
        id: 'tune-hidden-dim',
        workspace: PageType.NeuralBlueprint,
        title: text.steps.tuneHiddenDim.title,
        description: text.steps.tuneHiddenDim.description,
        hint: text.steps.tuneHiddenDim.hint,
        info: text.steps.tuneHiddenDim.info,
        animation: [
          {
            title: text.steps.tuneHiddenDim.openBlueprint.title,
            hint: text.steps.tuneHiddenDim.openBlueprint.hint,
            target: 'workspace-tab-neuralBlueprint',
            placement: 'bottom',
            skipWhen: dimEditSatisfiedCondition,
            completeWhen: {
              type: 'activeWorkspace',
              workspace: PageType.NeuralBlueprint,
            },
          },
          {
            title: text.steps.tuneHiddenDim.selectFirstLinear.title,
            hint: text.steps.tuneHiddenDim.selectFirstLinear.hint,
            selector: '[data-guide-node-kind="Linear"][data-guide-predecessor-ids~="task2_input"]',
            placement: 'left',
            skipWhen: dimEditSatisfiedCondition,
            completeWhen: {
              type: 'selectedModuleNode',
              selector: {
                kind: 'Linear',
                predecessorId: 'task2_input',
              },
            },
          },
          {
            title: text.steps.tuneHiddenDim.setOutputDim.title,
            hint: text.steps.tuneHiddenDim.setOutputDim.hint,
            target: 'property-output-dim',
            placement: 'left',
            completeWhen: dimEditSatisfiedCondition,
          },
          {
            title: text.steps.trainAndSave.openTraining.title,
            hint: text.steps.trainAndSave.openTraining.hint,
            target: 'workspace-tab-trainingProcess',
            placement: 'bottom',
            completeWhen: {
              type: 'activeWorkspace',
              workspace: PageType.TrainingProcess,
            },
          },
          {
            title: text.steps.tuneHiddenDim.initializeNetwork.title,
            hint: text.steps.tuneHiddenDim.initializeNetwork.hint,
            target: 'training-initialize-model',
            placement: 'right',
            completeWhen: {
              type: 'trainingFlag',
              flag: 'modelInitialized',
            },
          },
          {
            title: text.steps.tuneHiddenDim.retrain.title,
            hint: text.steps.tuneHiddenDim.retrain.hint,
            target: 'training-train-button',
            placement: 'right',
          },
        ],
        completeWhen: {
          type: 'trainingStat',
          stat: 'bestValLoss',
          max: TASK2_TARGET_VAL_LOSS,
        },
      },
    ],
  };
}

function createTask2GuideText(language: AppLanguage): Task2GuideText {
  const values = {
    targetValLoss: TASK2_TARGET_VAL_LOSS,
    tunedHiddenDim: TASK2_TUNED_HIDDEN_DIM,
    trainEpochs: TASK2_TRAIN_EPOCHS,
    retryEpochs: TASK2_RETRY_EPOCHS,
  };

  return language === 'zh'
    ? createTask2GuideTextZh(values)
    : createTask2GuideTextEn(values);
}
