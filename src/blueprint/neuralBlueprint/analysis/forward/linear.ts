import type {
  LinearNodeData,
  ModuleStatsForwardContext,
  ModuleStatsForwardResult,
} from '../../ModuleBaseNodeTypes';
import { EMPTY_STATS, EPS, LINEAR_SATURATION_GAIN } from './utils/constants';
import { negativeRateFromNormal } from './utils/math';
import {
  getBiasVariance,
  getFanIn,
  getLinearElementCorr,
  getWeightVariance,
} from './utils/moduleStats';

export function forwardLinearStats({
  node,
  inputs,
  inputNodes,
}: ModuleStatsForwardContext<LinearNodeData>): ModuleStatsForwardResult {
  const input = inputs[0] ?? EMPTY_STATS;
  const inputNode = inputNodes[0];
  const fanIn = getFanIn(node, inputs);
  const fanOut = node.outFeatures;
  const inputEffectiveRank = input.effectiveRank || fanOut;
  const saturation = 1 - Math.exp((-LINEAR_SATURATION_GAIN * inputEffectiveRank) / Math.max(fanOut, EPS));
  const effectiveRank = fanOut * saturation;
  const inputMinRank = input.minRank || input.rank || fanIn;
  const minRank = Math.min(inputMinRank, fanOut);
  const linearCorr = inputMinRank > 0
    ? Math.sqrt(minRank / inputMinRank)
    : 0;
  const weightVariance = getWeightVariance(node.initializationMode, fanIn, fanOut);
  const biasVariance = getBiasVariance(node);
  const outputMean = 0;
  const outputVariance = fanIn * weightVariance * (input.variance + input.mean ** 2) + biasVariance;

  return {
    stats: {
      rank: fanOut,
      dimLabel: 'normal',
      effectiveRank,
      saturation,
      minRank,
      mean: outputMean,
      variance: outputVariance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(outputMean, outputVariance),
      inputElementCorr: inputNode
        ? { [inputNode.id]: getLinearElementCorr(fanIn) }
        : undefined,
      inputLinearCorr: inputNode
        ? { [inputNode.id]: linearCorr }
        : undefined,
    },
  };
}
