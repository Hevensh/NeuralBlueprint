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
      description: 'Input -> Linear -> Output',
      hint: 'Connect Input to Linear, then connect Linear to Output.',
      completeWhen: {
        type: 'modulePathExists',
        chain: [
          { id: 'task1_input' },
          {
            kind: 'Linear',
            props: { outFeatures: TASK1_OUTPUT_DIM },
          },
          { id: 'task1_output' },
        ],
      },
    },
    {
      id: 'set-linear-output',
      workspace: PageType.NeuralBlueprint,
      title: 'Set Output',
      description: `Set output dim to ${TASK1_OUTPUT_DIM}`,
      hint: `Select the Linear node and set Output Dim to ${TASK1_OUTPUT_DIM}.`,
      completeWhen: {
        type: 'moduleNodeExists',
        selector: {
          kind: 'Linear',
          props: { outFeatures: TASK1_OUTPUT_DIM },
        },
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
