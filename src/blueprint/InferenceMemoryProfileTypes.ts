export interface InferenceMemoryGroup {
  id: string;
  nodeIds: string[];
  inferenceStages: number[];
  memoryPoint: number;
  ratio: number;
}

export interface InferenceMemoryStageSegment {
  groupId: string;
  memoryPoint: number;
  ratio: number;
}

export interface InferenceMemoryStage {
  stage: number;
  memoryPoint: number;
  ratio: number;
  segments: InferenceMemoryStageSegment[];
}

export interface InferenceMemoryProfile {
  totalMemoryPoint: number;
  groups: InferenceMemoryGroup[];
  stages: InferenceMemoryStage[];
}

export const EMPTY_INFERENCE_MEMORY_PROFILE: InferenceMemoryProfile = {
  totalMemoryPoint: 0,
  groups: [],
  stages: [],
};
