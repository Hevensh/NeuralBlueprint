import type { TaskFileConfig } from '../fileInitialState';
import type { BlueprintTaskFeatureConfig } from '../blueprintFeatureConfig';
import { PageType } from '../../blueprint/PageTypes';
import type { TaskGuideConfig } from '../taskGuideTypes';

const TASK1_INPUT_OUTPUT_DIM = 64;
const TASK1_INPUT_EFFECTIVE_RANK = 32;
const TASK1_OUTPUT_DIM = 2;

export const configFileTask1: BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: ['Linear'],
    showBackwardAnalysisControl: false,
    showVarianceAnalysisToggle: false,
    showRankAnalysisToggle: false,
  },
  knowledgeGraph: {
    canOpenTab: false,
    showKnowledgeGraphControls: false,
    networkCapabilityMode: 'blueprint',
    showAllocationButtons: false,
    enableMemoryAnalysis: true,
    enableMasteryOverfitAnalysis: true,
    enableUtilityAnalysis: true,
    enableGlobalDebugPreview: false,
  },
};

export const guideTask1: TaskGuideConfig = {
  id: 'task1-guide',
  title: 'Welcome to Neural Blueprint',
  steps: [
    {
      id: 'add-linear',
      workspace: PageType.NeuralBlueprint,
      title: 'Add Linear',
      description: 'Add a Linear node',
      hint: 'Drag a Linear node from the left panel.',
      animation: {
        target: 'module-card-Linear',
        placement: 'right',
        demo: {
          type: 'drag',
          fromTarget: 'module-card-Linear',
          toTarget: 'neural-blueprint-canvas',
          label: 'Linear',
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
      title: 'Connect',
      description: 'Connect Input to Output',
      hint: 'Connect Input to Output through one or more Linear nodes.',
      animation: [
        {
          title: 'Connect Input',
          hint: 'Drag from Input output handle to Linear input handle.',
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
          title: 'Connect Output',
          hint: 'Then drag from Linear output handle to Output input handle.',
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
      title: 'Set Dimension',
      description: `Set last Linear output dim to ${TASK1_OUTPUT_DIM}`,
      hint: `Set the last Linear node's Output Dim to ${TASK1_OUTPUT_DIM}, so the Output dim is normal.`,
      animation: [
        {
          title: 'Select Linear',
          hint: 'Select the Linear node connected to Output.',
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
          stats: { dimLabel: 'normal' },
        },
      },
    },
    {
      id: 'initialize-network',
      workspace: PageType.TrainingProcess,
      title: 'Initialize Network',
      description: 'Initialize neural memory',
      hint: 'Click Initialize Model in Network Capability.',
      animation: [
        {
          title: 'Open Training',
          hint: 'Switch to the Training Process tab.',
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
      title: 'Train 100 Epochs',
      description: 'Train to epoch 100',
      hint: 'Train the model until Train Epochs reaches 100.',
      animation: [
        {
          title: 'Open Training',
          hint: 'Switch to the Training Process tab.',
          target: 'workspace-tab-trainingProcess',
          placement: 'bottom',
          completeWhen: {
            type: 'activeWorkspace',
            workspace: PageType.TrainingProcess,
          },
        },
        {
          title: 'Set Train Steps',
          hint: 'Set Train Steps to 100.',
          target: 'training-train-steps',
          placement: 'right',
          completeWhen: {
            type: 'trainingStat',
            stat: 'trainSteps',
            min: 100,
          },
        },
        {
          title: 'Train',
          hint: 'Click Train to run 100 epochs.',
          target: 'training-train-button',
          placement: 'right',
        },
      ],
      completeWhen: {
        type: 'trainingStat',
        stat: 'epoch',
        min: 100,
      },
    },
  ],
};

export const configTask1: TaskFileConfig = {
  seed: '42',
  neuralBlueprint: {
    nodes: [
      {
        id: 'task1_input',
        kind: 'Input',
        position: { x: 0, y: 0 },
        outputDim: TASK1_INPUT_OUTPUT_DIM,
        effectiveRank: TASK1_INPUT_EFFECTIVE_RANK,
        normalizationMode: '0-1',
        lockedProperties: ['outputDim', 'effectiveRank'],
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
