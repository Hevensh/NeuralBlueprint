import type {
  InputNodeData,
  ThreeDInputNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import { createEmptyRepetitionStats } from '../repetitionRank';
import { createEmptyDistanceIndexRank } from '../distanceIndexRank';
import { EPS } from './utils/constants';
import { createSpatialViewFromShape } from '../spatialView';

export function forwardInputStats(
  node: InputNodeData | ThreeDInputNodeData,
): ModuleStats {
  const rank = node.outFeatures;
  const effectiveRank = node.inputEffectiveRank;
  const inputDistribution = node.normalizationMode === 'standard'
    ? {
      mean: 0,
      variance: 1,
      zeroRate: 0,
      negativeRate: 0.5,
    }
    : {
      mean: 0.5,
      variance: 1 / 12,
      zeroRate: 0,
      negativeRate: 0,
    };

  const shape = {
    time: node.kind === '3DInput'
      ? normalizeInputDimension(node.time)
      : 'absent' as const,
    channels: rank,
    height: node.kind === '3DInput' ? normalizeInputDimension(node.height) : 'absent' as const,
    width: node.kind === '3DInput' ? normalizeInputDimension(node.width) : 'absent' as const,
  };

  return {
    status: 'valid',
    rank: {
      outputRank: rank,
      basisRank: rank,
      effectiveRank,
      saturation: effectiveRank / Math.max(rank, EPS),
      minRank: rank,
    },
    shape,
    spatialView: createSpatialViewFromShape(shape),
    adaptation: {
      repetition: createEmptyRepetitionStats(),
      distanceIndex: createEmptyDistanceIndexRank(),
    },
    distribution: inputDistribution,
  };
}

function normalizeInputDimension(
  value: ThreeDInputNodeData['height'] | ThreeDInputNodeData['time'],
) {
  return value === 'unknown' || value === 'absent'
    ? value
    : Math.max(1, Math.round(value));
}
