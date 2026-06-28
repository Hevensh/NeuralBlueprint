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
    showBackwardAnalysisControl: true,
    showVarianceAnalysisToggle: true,
    showRankAnalysisToggle: true,
  },
  knowledgeGraph: {
    canOpenTab: true,
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
      completeWhen: {
        type: 'moduleNodeExists',
        selector: {
          id: 'task1_output',
          stats: { dimLabel: 'normal' },
        },
      },
    },
    {
      id: 'open-training-tab',
      workspace: PageType.TrainingProcess,
      title: 'Open Training',
      description: 'Switch to Training Process',
      hint: 'Switch to the Training Process tab.',
      completeWhen: {
        type: 'workspaceVisited',
        workspace: PageType.TrainingProcess,
      },
    },
    {
      id: 'initialize-network',
      workspace: PageType.TrainingProcess,
      title: 'Initialize Network',
      description: 'Initialize neural memory',
      hint: 'Click Initialize Model in Network Capability.',
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
        position: { x: 1, y: 0 },
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
