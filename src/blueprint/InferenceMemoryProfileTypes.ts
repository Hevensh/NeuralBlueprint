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
  networkSignature: string;
  totalMemoryPoint: number;
  groups: InferenceMemoryGroup[];
  stages: InferenceMemoryStage[];
}

export interface InferenceMemoryModel {
  id: string;
  label: string;
  nodeIds: string[];
  sourceNodeIds: string[];
  sinkNodeIds: string[];
  profile: InferenceMemoryProfile;
}

export const EMPTY_INFERENCE_MEMORY_PROFILE: InferenceMemoryProfile = {
  networkSignature: '',
  totalMemoryPoint: 0,
  groups: [],
  stages: [],
};

export function getInferenceMemoryProfileSignature(
  profile: InferenceMemoryProfile,
) {
  if (!profile.networkSignature) return '';

  return [
    profile.networkSignature,
    profile.groups.map((group) => (
      `${group.id}:${group.memoryPoint}:${group.inferenceStages.join(',')}`
    )).join('|'),
  ].join('::');
}
