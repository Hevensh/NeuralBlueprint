import type { TaskFileConfig } from '../fileInitialState';
import type { BlueprintTaskFeatureConfig } from '../blueprintFeatureConfig';



export const configFileTask1: BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: ['Linear'],
    showBackwardAnalysisControl: false,
    showVarianceAnalysisToggle: false,
    showRankAnalysisToggle: false,
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
}

export const configTask1: TaskFileConfig = {
  seed: '42',
  neuralBlueprint: {
    nodes: [
      {
        id: 'task1_input',
        kind: 'Input',
        position: { x: 0, y: 0 },
        outputDim: 64,
        effectiveRank: 32,
        normalizationMode: '0-1',
        lockedProperties: ['outputDim', 'effectiveRank'],
        deletable: false,
      },
      {
        id: 'task1_output',
        kind: 'Output',
        position: { x: 1, y: 0 },
        neededOutputDim: 64,
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
