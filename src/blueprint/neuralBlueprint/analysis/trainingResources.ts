import type { OptimizerKind } from '../../knowledgeGraph/model/types';
import type {
  ModuleBaseNode,
  ModuleDimension,
  ModuleNodeData,
  ModuleTensorShape,
} from '../ModuleBaseNodeTypes';

const BYTES_PER_FP32 = 4;
const TRAINING_ACTIVATION_COPIES = 2;
const ACTIVATION_WORKSPACE_FACTOR = 1.5;
const RUNTIME_RESERVE_MIB = 256;
const DEFAULT_BATCH_SIZE = 64;
const TRAINING_FLOP_FACTOR = 3;

export const DEFAULT_TRAINING_SERVER = {
  id: 'lab-gpu-1',
  label: 'Lab GPU 1',
  vramMiB: 1024,
  effectiveTflops: 1,
} as const;

export interface TrainingResourceProfile {
  batchSize: number;
  parameterCount: number;
  activationElementsPerSample: number;
  forwardFlopsPerSample: number;
  parameterAndGradientMiB: number;
  savedActivationMiB: number;
  estimatedPeakMiB: number;
  recommendedVramMiB: number;
  valid: boolean;
}

export interface TrainingRunEstimate {
  sampleCount: number;
  optimizer: OptimizerKind;
  optimizerStateMiB: number;
  estimatedPeakMiB: number;
  availableVramMiB: number;
  fitsInVram: boolean;
  workTflopPerEpoch: number;
  gameMinutesPerEpoch: number;
}

export const EMPTY_TRAINING_RESOURCE_PROFILE: TrainingResourceProfile = {
  batchSize: DEFAULT_BATCH_SIZE,
  parameterCount: 0,
  activationElementsPerSample: 0,
  forwardFlopsPerSample: 0,
  parameterAndGradientMiB: 0,
  savedActivationMiB: 0,
  estimatedPeakMiB: RUNTIME_RESERVE_MIB,
  recommendedVramMiB: 512,
  valid: false,
};

export function estimateTrainingResourceProfile(
  nodes: ModuleBaseNode[],
  batchSize = DEFAULT_BATCH_SIZE,
): TrainingResourceProfile {
  let parameterCount = 0;
  let activationElementsPerSample = 0;
  let forwardFlopsPerSample = 0;
  let valid = nodes.length > 0;

  nodes.forEach(({ data }) => {
    if (data.stats?.status !== 'valid') {
      if (isResourceBearingNode(data)) valid = false;
      return;
    }

    const outputElements = tensorElements(data.stats.shape);
    if (outputElements === null) {
      valid = false;
      return;
    }

    const inputShape = data.predecessors[0]?.stats?.shape;
    const inputElements = inputShape ? tensorElements(inputShape) : null;
    const inputChannels = inputShape
      ? numericDimension(inputShape.channels)
      : null;

    switch (data.kind) {
      case 'Input':
      case '3DInput':
        activationElementsPerSample += outputElements;
        break;
      case 'CNN': {
        if (inputChannels === null) {
          valid = false;
          break;
        }
        const kernelArea = data.kernelSize ** 2;
        parameterCount += inputChannels * data.outFeatures * kernelArea
          + (data.useBias ? data.outFeatures : 0);
        activationElementsPerSample += outputElements;
        forwardFlopsPerSample += outputElements
          * (2 * inputChannels * kernelArea + (data.useBias ? 1 : 0));
        break;
      }
      case 'ResNetStage': {
        const internals = data.internalConvs ?? [];
        if (internals.length === 0) {
          valid = false;
          break;
        }
        internals.forEach((internal) => {
          const internalElements = tensorElements(internal.stats.shape);
          if (internalElements === null) {
            valid = false;
            return;
          }
          const kernelArea = internal.kernelSize ** 2;
          parameterCount += internal.inputChannels
            * internal.outputChannels
            * kernelArea
            + 2 * internal.outputChannels;
          activationElementsPerSample += internalElements;
          forwardFlopsPerSample += internalElements
            * (2 * internal.inputChannels * kernelArea + 4);
        });
        activationElementsPerSample += outputElements * data.blockCount;
        forwardFlopsPerSample += outputElements * data.blockCount * 2;
        break;
      }
      case 'PatchEmbedding': {
        if (inputChannels === null) {
          valid = false;
          break;
        }
        const kernelArea = data.patchHeight * data.patchWidth;
        parameterCount += inputChannels * data.outFeatures * kernelArea
          + (data.useBias ? data.outFeatures : 0);
        activationElementsPerSample += outputElements;
        forwardFlopsPerSample += outputElements
          * (2 * inputChannels * kernelArea + (data.useBias ? 1 : 0));
        break;
      }
      case 'Linear': {
        if (inputChannels === null) {
          valid = false;
          break;
        }
        parameterCount += inputChannels * data.outFeatures
          + (data.useBias ? data.outFeatures : 0);
        activationElementsPerSample += outputElements;
        forwardFlopsPerSample += outputElements
          * (2 * inputChannels + (data.useBias ? 1 : 0));
        break;
      }
      case 'Normalization':
        if (numericDimension(data.stats.shape.channels) === null) {
          valid = false;
          break;
        }
        parameterCount += 2 * numericDimension(data.stats.shape.channels)!;
        activationElementsPerSample += outputElements;
        forwardFlopsPerSample += outputElements * 4;
        break;
      case 'Pooling':
        activationElementsPerSample += outputElements;
        forwardFlopsPerSample += outputElements * data.kernelSize ** 2;
        break;
      case 'GlobalPooling':
        activationElementsPerSample += outputElements;
        forwardFlopsPerSample += inputElements ?? outputElements;
        break;
      case 'ReLU':
      case 'Dropout':
      case 'Sum':
        activationElementsPerSample += outputElements;
        forwardFlopsPerSample += outputElements;
        break;
      case 'Flatten':
      case 'Output':
        break;
    }
  });

  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  const parameterAndGradientMiB = toMiB(
    parameterCount * BYTES_PER_FP32 * 2,
  );
  const savedActivationMiB = toMiB(
    activationElementsPerSample
      * safeBatchSize
      * BYTES_PER_FP32
      * TRAINING_ACTIVATION_COPIES,
  );
  const estimatedPeakMiB = RUNTIME_RESERVE_MIB
    + parameterAndGradientMiB
    + ACTIVATION_WORKSPACE_FACTOR * savedActivationMiB;

  return {
    batchSize: safeBatchSize,
    parameterCount,
    activationElementsPerSample,
    forwardFlopsPerSample,
    parameterAndGradientMiB,
    savedActivationMiB,
    estimatedPeakMiB,
    recommendedVramMiB: Math.max(512, Math.ceil(estimatedPeakMiB / 512) * 512),
    valid,
  };
}

export function estimateTrainingRun(
  profile: TrainingResourceProfile,
  sampleCount: number,
  optimizer: OptimizerKind,
  server = DEFAULT_TRAINING_SERVER,
): TrainingRunEstimate {
  const safeSamples = Math.max(1, Math.floor(sampleCount));
  const optimizerStateMiB = optimizer === 'adam'
    ? toMiB(profile.parameterCount * BYTES_PER_FP32 * 2)
    : 0;
  const estimatedPeakMiB = profile.estimatedPeakMiB + optimizerStateMiB;
  const workTflopPerEpoch = profile.forwardFlopsPerSample
    * TRAINING_FLOP_FACTOR
    * safeSamples
    / 1e12;
  const rawMinutes = workTflopPerEpoch
    / Math.max(0.001, server.effectiveTflops)
    / 60;

  return {
    sampleCount: safeSamples,
    optimizer,
    optimizerStateMiB,
    estimatedPeakMiB,
    availableVramMiB: server.vramMiB,
    fitsInVram: profile.valid && estimatedPeakMiB <= server.vramMiB,
    workTflopPerEpoch,
    gameMinutesPerEpoch: Math.max(1, Math.ceil(rawMinutes)),
  };
}

function tensorElements(shape: ModuleTensorShape) {
  const dimensions = [shape.time, shape.channels, shape.height, shape.width]
    .filter((dimension) => dimension !== 'absent')
    .map(numericDimension);
  if (dimensions.some((dimension) => dimension === null)) return null;
  return dimensions.reduce<number>((product, dimension) => (
    product * (dimension ?? 1)
  ), 1);
}

function numericDimension(value: ModuleDimension) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, value)
    : value === 'absent' ? 1 : null;
}

function isResourceBearingNode(data: ModuleNodeData) {
  return data.kind !== 'Output';
}

function toMiB(bytes: number) {
  return bytes / 1024 ** 2;
}
