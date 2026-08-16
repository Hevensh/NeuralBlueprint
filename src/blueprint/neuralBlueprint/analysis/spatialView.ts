import type {
  ModuleDimension,
  ModuleTensorShape,
  PatchFrame,
  SpatialAxis,
  SpatialAxisViewStats,
  SpatialViewStats,
  RepetitionStats,
} from '../ModuleBaseNodeTypes';
import type { SpatialBandPoints } from '../../SpatialAdaptationTypes';
import {
  SPATIAL_REACH_THRESHOLDS,
  SPATIAL_BANDS,
  createSpatialBandPoints,
} from '../../SpatialAdaptationTypes';

export const SPATIAL_AXES: SpatialAxis[] = ['time', 'height', 'width'];

export function createSpatialViewFromShape(
  shape: ModuleTensorShape,
): SpatialViewStats {
  return {
    axes: {
      time: createInputAxis(shape.time),
      height: createInputAxis(shape.height),
      width: createInputAxis(shape.width),
    },
    viewRank: 1,
  };
}

export function advanceSpatialView(
  input: SpatialViewStats,
  outputShape: ModuleTensorShape,
  operation: {
    kernel: Partial<Record<SpatialAxis, number>>;
    /** Effective source span; differs from direct samples for dilation. */
    reachKernel?: Partial<Record<SpatialAxis, number>>;
    stride: Partial<Record<SpatialAxis, number>>;
    learned: boolean;
  },
): SpatialViewStats {
  const axes = Object.fromEntries(SPATIAL_AXES.map((axis) => [
    axis,
    advanceAxis(
      input.axes[axis],
      outputShape[axis],
      operation.reachKernel?.[axis] ?? operation.kernel[axis] ?? 1,
      operation.stride[axis] ?? 1,
    ),
  ])) as Record<SpatialAxis, SpatialAxisViewStats>;
  const directSupport = SPATIAL_AXES.reduce((product, axis) => {
    if (input.axes[axis].positions === 'absent') return product;
    return product * sanitizePositiveInteger(operation.kernel[axis] ?? 1);
  }, 1);
  const nextRank = operation.learned
    ? input.viewRank + directSupport - 1
    : input.viewRank;

  return {
    axes,
    viewRank: Math.min(nextRank, getReachVolume(axes) ?? nextRank),
    patchFrame: input.patchFrame,
  };
}

export function createPatchFrame(
  view: SpatialViewStats,
  patchSize: Pick<Record<SpatialAxis, number>, 'height' | 'width'>,
  stride: Pick<Record<SpatialAxis, number>, 'height' | 'width'>,
): PatchFrame {
  const flattenOrder = SPATIAL_AXES.filter(
    (axis) => view.axes[axis].positions !== 'absent',
  );
  return {
    sourceShape: mapAxes(view, 'sourceSize'),
    gridShape: mapAxes(view, 'positions'),
    patchSize: {
      time: 1,
      height: sanitizePositiveInteger(patchSize.height),
      width: sanitizePositiveInteger(patchSize.width),
    },
    stride: {
      time: 1,
      height: sanitizePositiveInteger(stride.height),
      width: sanitizePositiveInteger(stride.width),
    },
    flattenOrder,
  };
}

export function globalizeSpatialView(
  input: SpatialViewStats,
): SpatialViewStats {
  const axes = Object.fromEntries(SPATIAL_AXES.map((axis) => {
    const current = input.axes[axis];
    if (current.positions === 'absent') return [axis, { ...current }];
    return [axis, {
      ...current,
      positions: 1,
      reach: current.sourceSize,
    }];
  })) as Record<SpatialAxis, SpatialAxisViewStats>;
  return {
    axes,
    viewRank: input.viewRank,
    patchFrame: input.patchFrame,
  };
}

export function mergeSpatialViews(
  views: SpatialViewStats[],
): SpatialViewStats {
  if (views.length === 0) {
    return createSpatialViewFromShape({
      time: 'absent',
      channels: 'unknown',
      height: 'absent',
      width: 'absent',
    });
  }
  const first = views[0];
  const axes = Object.fromEntries(SPATIAL_AXES.map((axis) => [
    axis,
    mergeAxis(views.map((view) => view.axes[axis])),
  ])) as Record<SpatialAxis, SpatialAxisViewStats>;
  const patchFrame = views.every(
    (view) => samePatchFrame(view.patchFrame, first.patchFrame),
  ) ? first.patchFrame : undefined;

  return {
    axes,
    viewRank: Math.max(...views.map((view) => sanitizeRank(view.viewRank))),
    patchFrame,
  };
}

export function spatialGridTokenCount(view: SpatialViewStats): ModuleDimension {
  const dimensions = SPATIAL_AXES
    .map((axis) => view.axes[axis].positions)
    .filter((value) => value !== 'absent');
  if (dimensions.some((value) => value === 'unknown')) return 'unknown';
  return dimensions.reduce<number>(
    (product, value) => product * (value as number),
    1,
  );
}

export function spatialViewAxisPoints(
  view: SpatialViewStats,
  axis: SpatialAxis,
): SpatialBandPoints {
  const axisView = view.axes[axis];
  if (axisView.positions === 'absent' || typeof axisView.reach !== 'number') {
    return createSpatialBandPoints();
  }
  const reach = axisView.reach;
  const presentAxisCount = Math.max(
    1,
    SPATIAL_AXES.filter(
      (candidate) => view.axes[candidate].positions !== 'absent',
    ).length,
  );
  const axisCapacity = sanitizeRank(view.viewRank) ** (1 / presentAxisCount);
  return Object.fromEntries(SPATIAL_BANDS.map(
    (band) => [
      band,
      axisCapacity * Math.min(
        reach / SPATIAL_REACH_THRESHOLDS[band],
        1,
      ),
    ],
  )) as unknown as SpatialBandPoints;
}

export function spatialViewRepetitionStats(
  view: SpatialViewStats,
): RepetitionStats {
  const presentAxes = SPATIAL_AXES.filter(
    (axis) => view.axes[axis].positions !== 'absent',
  );
  if (presentAxes.length === 0) {
    const empty = createSpatialBandPoints();
    return { potential: empty, effective: { ...empty } };
  }
  const perAxis = presentAxes.map((axis) => spatialViewAxisPoints(view, axis));
  const potential = Object.fromEntries(
    SPATIAL_BANDS.map((band) => [
      band,
      Math.min(...perAxis.map(
        (points) => points[band],
      )),
    ]),
  ) as unknown as SpatialBandPoints;
  return {
    potential,
    effective: { ...potential },
  };
}

function createInputAxis(dimension: ModuleDimension): SpatialAxisViewStats {
  if (dimension === 'absent') {
    return {
      sourceSize: 'absent',
      positions: 'absent',
      jump: 'absent',
      reach: 'absent',
    };
  }
  return {
    sourceSize: dimension,
    positions: dimension,
    jump: 1,
    reach: 1,
  };
}

function advanceAxis(
  input: SpatialAxisViewStats,
  outputPositions: ModuleDimension,
  kernel: number,
  stride: number,
): SpatialAxisViewStats {
  if (input.positions === 'absent') return { ...input };
  const safeKernel = sanitizePositiveInteger(kernel);
  const safeStride = sanitizePositiveInteger(stride);
  return {
    sourceSize: input.sourceSize,
    positions: outputPositions,
    jump: multiplyDimension(input.jump, safeStride),
    reach: addDimension(
      input.reach,
      multiplyDimension(input.jump, safeKernel - 1),
    ),
  };
}

function mergeAxis(axes: SpatialAxisViewStats[]): SpatialAxisViewStats {
  const first = axes[0];
  return {
    sourceSize: mergeEqualDimension(axes.map((axis) => axis.sourceSize)),
    positions: mergeEqualDimension(axes.map((axis) => axis.positions)),
    jump: mergeEqualDimension(axes.map((axis) => axis.jump)),
    reach: maxDimension(axes.map((axis) => axis.reach), first.reach),
  };
}

function mapAxes(
  view: SpatialViewStats,
  field: keyof SpatialAxisViewStats,
) {
  return Object.fromEntries(SPATIAL_AXES.map((axis) => [
    axis,
    view.axes[axis][field],
  ])) as Record<SpatialAxis, ModuleDimension>;
}

function getReachVolume(
  axes: Record<SpatialAxis, SpatialAxisViewStats>,
) {
  const reaches = SPATIAL_AXES
    .filter((axis) => axes[axis].positions !== 'absent')
    .map((axis) => axes[axis].reach);
  if (reaches.some((reach) => typeof reach !== 'number')) return undefined;
  return reaches.reduce<number>(
    (product, reach) => product * (reach as number),
    1,
  );
}

function multiplyDimension(
  value: ModuleDimension,
  multiplier: number,
): ModuleDimension {
  if (value === 'absent' || value === 'unknown') return value;
  return value * multiplier;
}

function addDimension(
  left: ModuleDimension,
  right: ModuleDimension,
): ModuleDimension {
  if (left === 'absent' || right === 'absent') return 'absent';
  if (left === 'unknown' || right === 'unknown') return 'unknown';
  return left + right;
}

function mergeEqualDimension(values: ModuleDimension[]): ModuleDimension {
  return values.every((value) => value === values[0])
    ? values[0]
    : 'unknown';
}

function maxDimension(
  values: ModuleDimension[],
  fallback: ModuleDimension,
): ModuleDimension {
  const numbers = values.filter((value): value is number => (
    typeof value === 'number'
  ));
  if (numbers.length === values.length) return Math.max(...numbers);
  return values.every((value) => value === 'absent') ? 'absent' : fallback;
}

function samePatchFrame(left?: PatchFrame, right?: PatchFrame) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sanitizePositiveInteger(value: number) {
  return Math.max(1, Math.round(value));
}

function sanitizeRank(value: number) {
  return Math.max(Number.isFinite(value) ? value : 0, 0);
}
