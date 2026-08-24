import {
  createSpatialAdaptationCapability,
  flattenSpatialAdaptationCapability,
  type SpatialAdaptationCapability,
} from './SpatialAdaptationTypes';
import {
  EMPTY_TRAINING_RESOURCE_PROFILE,
  type TrainingResourceProfile,
} from './neuralBlueprint/analysis/trainingResources';

export interface InferenceMemoryGroup {
  id: string;
  nodeIds: string[];
  inferenceStages: number[];
  memoryPoint: number;
  adaptationCapability: SpatialAdaptationCapability;
  variance: InferenceVarianceSummary;
  varianceLogDistance: number;
  nodeWeights: InferenceMemoryNodeWeight[];
  aggregationPairs: InferenceMemoryAggregationPair[];
  ratio: number;
}

export interface InferenceVarianceSummary {
  forwardStd: number | null;
  backwardStd: number | null;
  ratio: number | null;
  logDistance: number | null;
  validWeight: number;
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
  adaptationCapability: SpatialAdaptationCapability;
  ratio: number;
}

export interface InferenceMemoryStage {
  stage: number;
  memoryPoint: number;
  adaptationCapability: SpatialAdaptationCapability;
  ratio: number;
  segments: InferenceMemoryStageSegment[];
}

export interface InferenceMemoryProfile {
  networkSignature: string;
  pretrainingModules: InferencePretrainingModule[];
  totalMemoryPoint: number;
  totalAdaptationCapability: SpatialAdaptationCapability;
  groups: InferenceMemoryGroup[];
  stages: InferenceMemoryStage[];
  trainingResources: TrainingResourceProfile;
}

export interface InferencePretrainingModule {
  nodeId: string;
  order: number;
  memoryPointsPerDependency: number;
  aggregationWeight: number;
  inferenceStages: number[];
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
  pretrainingModules: [],
  totalMemoryPoint: 0,
  totalAdaptationCapability: createSpatialAdaptationCapability(),
  groups: [],
  stages: [],
  trainingResources: EMPTY_TRAINING_RESOURCE_PROFILE,
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
        ...flattenSpatialAdaptationCapability(group.adaptationCapability)
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
