import type {
  LinearNodeData,
  ModuleNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import { preserveRepetitionStats } from '../repetitionRank';
import { readTensorShape } from './spatial';
import { EPS, LINEAR_SATURATION_GAIN } from './utils/constants';
import { negativeRateFromNormal } from './utils/math';
import {
  getBiasVariance,
  getFanIn,
  getLinearElementCorr,
  getWeightVariance,
} from './utils/moduleStats';

export function forwardLinearStats(
  node: LinearNodeData,
  input: ModuleStats,
  inputNode?: ModuleNodeData,
): ModuleStats {
  const fanIn = getFanIn(node, input);
  const fanOut = node.outFeatures;
  const inputEffectiveRank = input.rank.effectiveRank || fanOut;
  const saturation = 1 - Math.exp((-LINEAR_SATURATION_GAIN * inputEffectiveRank) / Math.max(fanIn, EPS));
  const effectiveRank = fanIn * saturation;
  const inputMinRank = input.rank.minRank
    || input.rank.outputRank
    || fanIn;
  const minRank = Math.min(inputMinRank, fanOut);
  const linearCorr = inputMinRank > 0
    ? Math.sqrt(minRank / inputMinRank)
    : 0;
  const weightVariance = getWeightVariance(node.initializationMode, fanIn, fanOut);
  const biasVariance = getBiasVariance(node);
  const outputMean = 0;
  const outputVariance = fanIn * weightVariance * (
    input.distribution.variance + input.distribution.mean ** 2
  ) + biasVariance;
  const inputShape = readTensorShape(input);

  return {
    status: 'valid',
    rank: {
      outputRank: fanOut,
      basisRank: fanIn,
      effectiveRank,
      saturation,
      minRank,
    },
    shape: {
      time: inputShape.time,
      channels: fanOut,
      height: inputShape.height,
      width: inputShape.width,
    },
    adaptation: {
      repetition: preserveRepetitionStats(input, effectiveRank),
    },
    distribution: {
      mean: outputMean,
      variance: outputVariance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(outputMean, outputVariance),
    },
    inputElementCorr: inputNode
      ? { [inputNode.id]: getLinearElementCorr(fanIn) }
      : undefined,
    inputLinearCorr: inputNode
      ? { [inputNode.id]: linearCorr }
      : undefined,
  };
}
