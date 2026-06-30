export interface InferenceMemoryGroup {
  id: string;
  nodeIds: string[];
  inferenceStages: number[];
  memoryPoint: number;
  varianceLogDistance: number;
  nodeWeights: InferenceMemoryNodeWeight[];
  aggregationPairs: InferenceMemoryAggregationPair[];
  ratio: number;
}

export interface InferenceMemoryNodeWeight {
  nodeId: string;
  weight: number;
  rhoCount: number;
}

export interface InferenceMemoryAggregationPair {
  leftNodeId: string;
  rightNodeId: string;
  rho: number;
  leftWeight: number;
  rightWeight: number;
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
      [
        group.id,
        group.memoryPoint,
        group.inferenceStages.join(','),
        formatSignatureNumber(group.varianceLogDistance),
      ].join(':')
    )).join('|'),
  ].join('::');
}

function formatSignatureNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : '0';
}
