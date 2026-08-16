import type {
  ModuleDimension,
  ModuleStats,
  ModuleTensorShape,
} from '../../ModuleBaseNodeTypes';

const DIMENSION_KEYS = ['time', 'channels', 'height', 'width'] as const;

export function vectorShape(channels: ModuleDimension): ModuleTensorShape {
  return {
    time: 'absent',
    channels,
    height: 'absent',
    width: 'absent',
  };
}

export function readTensorShape(input: ModuleStats): ModuleTensorShape {
  return input.shape ?? vectorShape(
    Number.isFinite(input.rank.outputRank)
      ? input.rank.outputRank
      : 'unknown',
  );
}

export function inferSpatialOutputShape(
  input: ModuleStats,
  outputChannels: ModuleDimension,
  kernelSize: number,
  stride: number,
  padding: number,
  dilation = 1,
): ModuleTensorShape | null {
  const shape = readTensorShape(input);
  const height = outputSize(
    shape.height,
    kernelSize,
    stride,
    padding,
    dilation,
  );
  const width = outputSize(
    shape.width,
    kernelSize,
    stride,
    padding,
    dilation,
  );
  if (height === null || width === null) return null;
  return {
    time: shape.time,
    channels: typeof outputChannels === 'number'
      ? Math.max(1, Math.round(outputChannels))
      : outputChannels,
    height,
    width,
  };
}

export function inferPatchEmbeddingShape(
  input: ModuleStats,
  outputChannels: number,
  patchHeight: number,
  patchWidth: number,
  strideHeight: number,
  strideWidth: number,
): {
  shape: ModuleTensorShape;
  gridShape: ModuleTensorShape;
} | null {
  const inputShape = readTensorShape(input);
  const height = outputSize(
    inputShape.height,
    patchHeight,
    strideHeight,
    0,
    1,
  );
  const width = outputSize(
    inputShape.width,
    patchWidth,
    strideWidth,
    0,
    1,
  );
  if (height === null || width === null) return null;
  const tokenCount = multiplyPresentDimensions([
    inputShape.time,
    height,
    width,
  ]);
  return {
    shape: {
      time: tokenCount,
      channels: Math.max(1, Math.round(outputChannels)),
      height: 'absent',
      width: 'absent',
    },
    gridShape: {
      time: inputShape.time,
      channels: Math.max(1, Math.round(outputChannels)),
      height,
      width,
    },
  };
}

export function flattenTensorShape(shape: ModuleTensorShape) {
  const dimensions = DIMENSION_KEYS
    .map((key) => shape[key])
    .filter((dimension) => dimension !== 'absent');
  const channels = dimensions.some((dimension) => dimension === 'unknown')
    ? 'unknown'
    : dimensions.reduce<number>(
      (product, dimension) => product * (dimension as number),
      1,
    );
  return vectorShape(channels);
}

export function globalPoolingTensorShape(shape: ModuleTensorShape) {
  return vectorShape(shape.channels);
}

export function getGlobalAggregationSize(
  shape: ModuleTensorShape,
): number | 'unknown' | null {
  const dimensions = [shape.time, shape.height, shape.width]
    .filter((dimension) => dimension !== 'absent');
  if (dimensions.length === 0) return null;
  if (dimensions.some((dimension) => dimension === 'unknown')) {
    return 'unknown';
  }
  return dimensions.reduce<number>(
    (product, dimension) => product * (dimension as number),
    1,
  );
}

export function sameTensorShape(
  left: ModuleTensorShape | undefined,
  right: ModuleTensorShape | undefined,
) {
  if (!left || !right) return left === right;
  return DIMENSION_KEYS.every((key) => sameDimension(left[key], right[key]));
}

export function mergeTensorShapes(shapes: ModuleTensorShape[]) {
  if (shapes.length === 0) return vectorShape('unknown');
  return Object.fromEntries(DIMENSION_KEYS.map((key) => [
    key,
    mergeDimensions(shapes.map((shape) => shape[key])),
  ])) as unknown as ModuleTensorShape;
}

export function getKnownDimension(dimension: ModuleDimension) {
  return typeof dimension === 'number' && Number.isFinite(dimension)
    ? dimension
    : undefined;
}

function sameDimension(left: ModuleDimension, right: ModuleDimension) {
  if (left === 'absent' || right === 'absent') return left === right;
  if (left === 'unknown' || right === 'unknown') return true;
  return left === right;
}

function mergeDimensions(dimensions: ModuleDimension[]): ModuleDimension {
  if (dimensions.every((dimension) => dimension === 'absent')) return 'absent';
  if (dimensions.some((dimension) => dimension === 'absent')) return 'unknown';
  if (dimensions.some((dimension) => dimension === 'unknown')) return 'unknown';
  return dimensions.every((dimension) => dimension === dimensions[0])
    ? dimensions[0]
    : 'unknown';
}

function outputSize(
  input: ModuleDimension,
  kernelSize: number,
  stride: number,
  padding: number,
  dilation: number,
): number | 'unknown' | null {
  if (input === 'absent') return null;
  if (input === 'unknown') return 'unknown';
  const safeInput = Math.max(1, Math.round(input));
  const safeKernel = Math.max(1, Math.round(kernelSize));
  const safeStride = Math.max(1, Math.round(stride));
  const safePadding = Math.max(0, Math.round(padding));
  const safeDilation = Math.max(1, Math.round(dilation));
  const output = Math.floor(
    (
      safeInput
      + 2 * safePadding
      - safeDilation * (safeKernel - 1)
      - 1
    ) / safeStride + 1,
  );
  return output >= 1 ? output : null;
}

function multiplyPresentDimensions(
  dimensions: ModuleDimension[],
): ModuleDimension {
  const present = dimensions.filter((dimension) => dimension !== 'absent');
  if (present.some((dimension) => dimension === 'unknown')) return 'unknown';
  return present.reduce<number>(
    (product, dimension) => product * (dimension as number),
    1,
  );
}
