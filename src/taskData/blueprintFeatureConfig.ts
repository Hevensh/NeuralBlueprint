import type { MemoryProfileSource } from '../blueprint/knowledgeGraph/model/types';
import type { ModuleBaseNodeKind } from '../blueprint/neuralBlueprint/ModuleBaseNodeTypes';
import { MODULE_KINDS } from '../blueprint/neuralBlueprint/moduleRegistry';

export type NetworkCapabilityMode = MemoryProfileSource | 'select';

export const ALL_NEURAL_BLUEPRINT_MODULES: ModuleBaseNodeKind[] = [
  ...MODULE_KINDS,
];

export type BlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: boolean;
    availableModuleKinds?: ModuleBaseNodeKind[];
    showBackwardAnalysisControl?: boolean;
    showVarianceAnalysisToggle?: boolean;
    showRankAnalysisToggle?: boolean;
    showRepetitionAnalysisToggle?: boolean;
    showDistanceIndexAnalysisToggle?: boolean;
  };
  knowledgeGraph: {
    canOpenTab: boolean;
    showKnowledgeGraphControls?: boolean;
    networkCapabilityMode?: NetworkCapabilityMode;
    showAllocationButtons?: boolean;
    enableMemoryAnalysis?: boolean;
    enableMasteryOverfitAnalysis?: boolean;
    enableUtilityAnalysis?: boolean;
    enableGlobalDebugPreview?: boolean;
  };
};

export type ResolvedBlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: boolean;
    availableModuleKinds: ModuleBaseNodeKind[];
    showBackwardAnalysisControl: boolean;
    showVarianceAnalysisToggle: boolean;
    showRankAnalysisToggle: boolean;
    showRepetitionAnalysisToggle: boolean;
    showDistanceIndexAnalysisToggle: boolean;
  };
  knowledgeGraph: {
    canOpenTab: boolean;
    showKnowledgeGraphControls: boolean;
    networkCapabilityMode: NetworkCapabilityMode;
    showAllocationButtons: boolean;
    enableMemoryAnalysis: boolean;
    enableMasteryOverfitAnalysis: boolean;
    enableUtilityAnalysis: boolean;
    enableGlobalDebugPreview: boolean;
  };
};

export const DEFAULT_BLUEPRINT_TASK_FEATURES: ResolvedBlueprintTaskFeatureConfig = {
  neuralBlueprint: {
    canOpenTab: true,
    availableModuleKinds: ALL_NEURAL_BLUEPRINT_MODULES,
    showBackwardAnalysisControl: true,
    showVarianceAnalysisToggle: true,
    showRankAnalysisToggle: true,
    showRepetitionAnalysisToggle: true,
    showDistanceIndexAnalysisToggle: true,
  },
  knowledgeGraph: {
    canOpenTab: true,
    showKnowledgeGraphControls: true,
    networkCapabilityMode: 'select',
    showAllocationButtons: true,
    enableMemoryAnalysis: true,
    enableMasteryOverfitAnalysis: true,
    enableUtilityAnalysis: true,
    enableGlobalDebugPreview: true,
  },
};

export function resolveBlueprintTaskFeatureConfig(
  config: BlueprintTaskFeatureConfig | undefined,
): ResolvedBlueprintTaskFeatureConfig {
  const neuralBlueprint = config?.neuralBlueprint;
  const knowledgeGraph = config?.knowledgeGraph;

  return {
    neuralBlueprint: {
      ...DEFAULT_BLUEPRINT_TASK_FEATURES.neuralBlueprint,
      ...neuralBlueprint,
    },
    knowledgeGraph: {
      ...DEFAULT_BLUEPRINT_TASK_FEATURES.knowledgeGraph,
      ...knowledgeGraph,
      networkCapabilityMode: knowledgeGraph?.networkCapabilityMode
        ?? (knowledgeGraph?.canOpenTab === false
          ? 'blueprint'
          : DEFAULT_BLUEPRINT_TASK_FEATURES.knowledgeGraph.networkCapabilityMode),
    },
  };
}
