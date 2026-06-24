import type {
  KnowledgeGraphControlState,
  KnowledgeGraphSessionState,
  TrainingControlState,
} from '../../dataStorage/knowledgeGraphStorage';

export function getControllerControls(state: KnowledgeGraphSessionState) {
  return {
    graph: state.graphControls,
    network: {
      memory: state.memory.availableMemoryPoints,
      reasoning: state.memory.availableReasoningPoints,
      initializationSeed: state.trainingControls.initializationSeed,
    },
    training: state.trainingControls,
  };
}

export function mergeGraphControls(
  current: KnowledgeGraphControlState,
  patch: Partial<KnowledgeGraphControlState>,
): KnowledgeGraphControlState {
  return { ...current, ...patch };
}

export function mergeTrainingControls(
  current: TrainingControlState,
  patch: Partial<TrainingControlState>,
): TrainingControlState {
  return { ...current, ...patch };
}

export type BlueprintControllerControls = ReturnType<
  typeof getControllerControls
>;
