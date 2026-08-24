import type {
  CNNNodeData,
  ModuleStats,
  ResNetInternalConvAnalysis,
  ResNetStageNodeData,
} from '../../ModuleBaseNodeTypes';
import { createEmptyDistanceIndexRank } from '../distanceIndexRank';
import { maxRepetitionStats } from '../repetitionRank';
import { mergeSpatialViews } from '../spatialView';
import { forwardCNNStats } from './cnn';
import { forwardReLUStats } from './relu';
import { readTensorShape, sameTensorShape } from './spatial';
import { EPS } from './utils/constants';
import { estimateSumNegativeRate } from './utils/math';
import { forwardNormalizationStats } from './normalization';

export function forwardResNetStageStats(
  node: ResNetStageNodeData,
  input: ModuleStats,
): ModuleStats | null {
  let current = input;
  const internalConvs: ResNetInternalConvAnalysis[] = [];
  const blockCount = Math.max(1, Math.round(node.blockCount));

  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    const blockInput = current;
    const stride = blockIndex === 0 ? Math.max(1, Math.round(node.stride)) : 1;
    const conv1 = runInternalConv(
      node,
      blockInput,
      blockIndex,
      'main',
      1,
      3,
      stride,
    );
    if (!conv1) return null;
    internalConvs.push(conv1.analysis);

    const activated = forwardReLUStats(conv1.stats);
    const conv2 = runInternalConv(
      node,
      activated,
      blockIndex,
      'main',
      2,
      3,
      1,
    );
    if (!conv2) return null;
    internalConvs.push(conv2.analysis);

    const inputChannels = knownChannels(blockInput);
    const needsProjection = stride !== 1 || inputChannels !== node.outFeatures;
    let skip = blockInput;
    if (needsProjection) {
      const projection = runInternalConv(
        node,
        blockInput,
        blockIndex,
        'projection',
        0,
        1,
        stride,
      );
      if (!projection) return null;
      skip = projection.stats;
      internalConvs.push(projection.analysis);
    }

    const merged = mergeResidual(conv2.stats, skip);
    if (!merged) return null;
    current = forwardReLUStats(merged);
  }

  node.internalConvs = internalConvs;
  const spatialResolutionFit = stageResolutionFit(node, current);
  return {
    ...current,
    spatialResolutionFit,
    adaptation: {
      ...current.adaptation,
      repetition: scaleRepetitionStats(
        current.adaptation.repetition,
        spatialResolutionFit,
      ),
    },
  };
}

function runInternalConv(
  stage: ResNetStageNodeData,
  input: ModuleStats,
  blockIndex: number,
  branch: ResNetInternalConvAnalysis['branch'],
  convIndex: number,
  kernelSize: number,
  stride: number,
) {
  const config = {
    ...stage,
    id: `${stage.id}:b${blockIndex + 1}:${branch}:${convIndex}`,
    kind: 'CNN' as const,
    kernelSize,
    stride,
    padding: Math.floor(kernelSize / 2),
    dilation: 1,
    groups: 1,
  } as CNNNodeData;
  const convolutionStats = forwardCNNStats(config, input);
  if (!convolutionStats) return null;
  const stats = forwardNormalizationStats(convolutionStats);
  const analysis: ResNetInternalConvAnalysis = {
    id: config.id,
    blockIndex,
    branch,
    inputChannels: knownChannels(input),
    outputChannels: stage.outFeatures,
    kernelSize,
    stride,
    stats,
  };
  return { stats, analysis };
}


function mergeResidual(main: ModuleStats, skip: ModuleStats): ModuleStats | null {
  if (!sameTensorShape(readTensorShape(main), readTensorShape(skip))) return null;
  const outputRank = Math.max(main.rank.outputRank, skip.rank.outputRank);
  const majorRank = Math.max(main.rank.effectiveRank, skip.rank.effectiveRank);
  const minorRank = Math.min(main.rank.effectiveRank, skip.rank.effectiveRank);
  const effectiveRank = Math.min(
    outputRank,
    majorRank + 0.25 * minorRank,
  );
  const mean = main.distribution.mean + skip.distribution.mean;
  const mainStd = Math.sqrt(Math.max(0, main.distribution.variance));
  const skipStd = Math.sqrt(Math.max(0, skip.distribution.variance));
  const variance = Math.max(
    0,
    main.distribution.variance
      + skip.distribution.variance
      + 0.5 * mainStd * skipStd,
  );
  const spatialView = mergeSpatialViews([main.spatialView, skip.spatialView]);

  return {
    status: 'valid',
    rank: {
      outputRank,
      basisRank: outputRank,
      effectiveRank,
      saturation: effectiveRank / Math.max(outputRank, EPS),
      minRank: Math.max(
        main.rank.minRank ?? main.rank.outputRank,
        skip.rank.minRank ?? skip.rank.outputRank,
      ),
    },
    distribution: {
      mean,
      variance,
      zeroRate: main.distribution.zeroRate * skip.distribution.zeroRate,
      negativeRate: estimateSumNegativeRate(mean, variance),
    },
    shape: main.shape,
    spatialView,
    adaptation: {
      repetition: maxRepetitionStats([main, skip], effectiveRank),
      distanceIndex: createEmptyDistanceIndexRank(),
    },
  };
}

function knownChannels(stats: ModuleStats) {
  return typeof stats.shape.channels === 'number'
    ? stats.shape.channels
    : Math.max(1, Math.round(stats.rank.outputRank));
}

function stageResolutionFit(
  node: ResNetStageNodeData,
  output: ModuleStats,
) {
  const actualHeight = numericDimension(output.shape.height);
  const actualWidth = numericDimension(output.shape.width);
  const referenceHeight = numericDimension(node.referenceHeight);
  const referenceWidth = numericDimension(node.referenceWidth);
  if (
    actualHeight === undefined
    || actualWidth === undefined
    || referenceHeight === undefined
    || referenceWidth === undefined
  ) return 1;

  const heightDistance = Math.abs(Math.log2(actualHeight / referenceHeight));
  const widthDistance = Math.abs(Math.log2(actualWidth / referenceWidth));
  const meanDistance = (heightDistance + widthDistance) / 2;
  return 1 / (1 + 0.35 * meanDistance);
}

function scaleRepetitionStats(
  repetition: ModuleStats['adaptation']['repetition'],
  factor: number,
) {
  const scale = (value: number) => value * factor;
  return {
    potential: {
      small: scale(repetition.potential.small),
      medium: scale(repetition.potential.medium),
      large: scale(repetition.potential.large),
      extraLarge: scale(repetition.potential.extraLarge),
      global: scale(repetition.potential.global),
    },
    effective: {
      small: scale(repetition.effective.small),
      medium: scale(repetition.effective.medium),
      large: scale(repetition.effective.large),
      extraLarge: scale(repetition.effective.extraLarge),
      global: scale(repetition.effective.global),
    },
  };
}

function numericDimension(value: number | 'unknown' | 'absent' | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, value)
    : undefined;
}
