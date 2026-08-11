import type {
  InputNodeData,
  ThreeDInputNodeData,
  ModuleStats,
} from '../../ModuleBaseNodeTypes';
import { EPS } from './utils/constants';

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

  return {
    rank,
    dimLabel: 'normal',
    effectiveRank,
    saturation: effectiveRank / Math.max(rank, EPS),
    shape: {
      time: 'absent',
      channels: rank,
      height: node.kind === '3DInput' ? normalizeInputDimension(node.height) : 'absent',
      width: node.kind === '3DInput' ? normalizeInputDimension(node.width) : 'absent',
    },
    repetitionRank: { high: 0, medium: 0, low: 0 },
    ...inputDistribution,
  };
}

function normalizeInputDimension(value: ThreeDInputNodeData['height']) {
  return value === 'unknown' ? value : Math.max(1, Math.round(value));
}
