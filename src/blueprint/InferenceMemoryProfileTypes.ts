export interface InferenceRepetitionAdaptationPoints {
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
  global: number;
}

export interface InferenceDistanceAdaptationPoints {
  none: number;
  short: number;
  medium: number;
  long: number;
  global: number;
}

export interface InferenceAdaptationPoints {
  repetition: InferenceRepetitionAdaptationPoints;
  distance: InferenceDistanceAdaptationPoints;
}

export interface InferenceMemoryGroup {
  id: string;
  nodeIds: string[];
  inferenceStages: number[];
  memoryPoint: number;
  adaptationPoints: InferenceAdaptationPoints;
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
  adaptationPoints: InferenceAdaptationPoints;
  ratio: number;
}

export interface InferenceMemoryStage {
  stage: number;
  memoryPoint: number;
  adaptationPoints: InferenceAdaptationPoints;
  ratio: number;
  segments: InferenceMemoryStageSegment[];
}

export interface InferenceMemoryProfile {
  networkSignature: string;
  totalMemoryPoint: number;
  totalAdaptationPoints: InferenceAdaptationPoints;
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
  totalAdaptationPoints: {
    repetition: {
      small: 0,
      medium: 0,
      large: 0,
      extraLarge: 0,
      global: 0,
    },
    distance: {
      none: 0,
      short: 0,
      medium: 0,
      long: 0,
      global: 0,
    },
  },
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
        ...Object.values(group.adaptationPoints.repetition)
          .map(formatSignatureNumber),
        ...Object.values(group.adaptationPoints.distance)
          .map(formatSignatureNumber),
        group.inferenceStages.join(','),
        formatSignatureNumber(group.varianceLogDistance),
      ].join(':')
    )).join('|'),
  ].join('::');
}

function formatSignatureNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : '0';
}
