import type {
  ModuleStats,
  ResizeNodeData,
} from '../../ModuleBaseNodeTypes';
import { resizeSpatialView, spatialViewRepetitionStats } from '../spatialView';
import { readTensorShape } from './spatial';

export function forwardResizeStats(
  node: ResizeNodeData,
  input: ModuleStats,
): ModuleStats | null {
  const inputShape = readTensorShape(input);
  if (inputShape.height === 'absent' || inputShape.width === 'absent') {
    return null;
  }

  const shape = {
    ...inputShape,
    height: Math.max(1, Math.round(node.targetHeight)),
    width: Math.max(1, Math.round(node.targetWidth)),
  };
  const spatialView = resizeSpatialView(input.spatialView, shape);

  return {
    ...input,
    status: 'valid',
    shape,
    spatialView,
    adaptation: {
      ...input.adaptation,
      repetition: spatialViewRepetitionStats(spatialView),
    },
  };
}
