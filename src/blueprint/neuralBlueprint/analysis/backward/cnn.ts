import type {
  CNNNodeData,
  ModuleStatsBackward,
} from '../../ModuleBaseNodeTypes';
import { EPS, LINEAR_SATURATION_GAIN } from '../forward/utils/constants';
import { negativeRateFromNormal } from '../forward/utils/math';
import { getWeightVariance } from '../forward/utils/moduleStats';
import { getKnownDimension } from '../forward/spatial';

export function backwardCNNStats(
  node: CNNNodeData,
  gradient: ModuleStatsBackward,
): ModuleStatsBackward {
  const inputChannels = Math.max(
    1,
    getKnownDimension(
      node.predecessors[0]?.stats?.shape?.channels ?? 'unknown',
    )
      ?? node.predecessors[0]?.stats?.rank.outputRank
      ?? gradient.rank.outputRank,
  );
  const kernelArea = Math.max(1, Math.round(node.kernelSize) ** 2);
  const fanIn = inputChannels * kernelArea;
  const fanOut = Math.max(1, node.outFeatures * kernelArea);
  const effectiveRank = inputChannels * (
    1 - Math.exp(
      (-LINEAR_SATURATION_GAIN * gradient.rank.effectiveRank)
        / Math.max(inputChannels, EPS),
    )
  );
  const weightVariance = getWeightVariance(
    node.initializationMode,
    fanIn,
    fanOut,
  );
  const mean = 0;
  const variance = fanOut
    * weightVariance
    * (
      gradient.distribution.variance
        + gradient.distribution.mean ** 2
    );

  return {
    rank: {
      outputRank: inputChannels,
      basisRank: inputChannels,
      effectiveRank,
      saturation: effectiveRank / inputChannels,
      minRank: Math.min(
        gradient.rank.minRank ?? gradient.rank.outputRank,
        inputChannels,
      ),
    },
    distribution: {
      mean,
      variance,
      zeroRate: 0,
      negativeRate: negativeRateFromNormal(mean, variance),
    },
  };
}
