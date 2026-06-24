import type { MemoryProfileSource } from '../blueprint/knowledgeGraph/model/types';
import type { ModuleBaseNodeKind } from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';

export type NetworkCapabilityMode = MemoryProfileSource | 'select';

export const ALL_NEURAL_BLUEPRINT_MODULES: ModuleBaseNodeKind[] = [
  'Input',
  'Linear',
  'ReLU',
  'Dropout',
  'Sum',
  'Output',
];

export type BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: boolean;
    availableModuleKinds: ModuleBaseNodeKind[];
    showBackwardAnalysisControl: boolean;
    showVarianceAnalysisToggle: boolean;
    showRankAnalysisToggle: boolean;
  };
  knowledgeGraph: {
    canOpenTab: boolean;
    showKnowledgeGraphControls: boolean;
    networkCapabilityMode: NetworkCapabilityMode;
    showAllocationButtons: boolean;
  };
};

export const DEFAULT_BLUEPRINT_TASK_FEATURES: BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: ALL_NEURAL_BLUEPRINT_MODULES,
    showBackwardAnalysisControl: true,
    showVarianceAnalysisToggle: true,
    showRankAnalysisToggle: true,
  },
  knowledgeGraph: {
    canOpenTab: true,
    showKnowledgeGraphControls: true,
    networkCapabilityMode: 'select',
    showAllocationButtons: true,
  },
};

export function getBlueprintTaskFeatureConfig(): BlueprintTaskFeatureConfig {
  return DEFAULT_BLUEPRINT_TASK_FEATURES;
}
