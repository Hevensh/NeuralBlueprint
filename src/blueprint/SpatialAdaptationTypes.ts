export const SPATIAL_AXES = ['time', 'height', 'width'] as const;
export const SPATIAL_BANDS = [
  'small',
  'medium',
  'large',
  'extraLarge',
  'global',
] as const;
export const SPATIAL_ADAPTATION_ROUTES = ['scale', 'index'] as const;

/** Reference total for one ordinary knowledge-node adaptation requirement. */
export const DEFAULT_KNOWLEDGE_ADAPTATION_REQUIREMENT = 12;

/** Equal H/W split used by the first spatial CNN calibration fixtures. */
export const DEFAULT_SPATIAL_AXIS_REQUIREMENT =
  DEFAULT_KNOWLEDGE_ADAPTATION_REQUIREMENT / 2;

export type SpatialAxis = typeof SPATIAL_AXES[number];
export type SpatialBand = typeof SPATIAL_BANDS[number];
export type SpatialAdaptationRoute =
  typeof SPATIAL_ADAPTATION_ROUTES[number];

export type SpatialBandPoints<T = number> = Record<SpatialBand, T>;

/** Provisional absolute source-coordinate spans for S/M/L/XL/G. */
export const SPATIAL_REACH_THRESHOLDS: SpatialBandPoints = {
  small: 3,
  medium: 7,
  large: 15,
  extraLarge: 31,
  global: 63,
};

export type AxisSpatialAdaptation<T = number> = {
  scale: SpatialBandPoints<T>;
  index: SpatialBandPoints<T>;
};

export type SpatialAdaptationCapability<T = number> = Record<
  SpatialAxis,
  AxisSpatialAdaptation<T>
>;

export type SpatialAdaptationRequirements<T = number> = Partial<Record<
  SpatialAxis,
  AxisSpatialAdaptation<T>
>>;

export function createSpatialBandPoints(): SpatialBandPoints {
  return Object.fromEntries(
    SPATIAL_BANDS.map((band) => [band, 0]),
  ) as SpatialBandPoints;
}

export function createAxisSpatialAdaptation(): AxisSpatialAdaptation {
  return {
    scale: createSpatialBandPoints(),
    index: createSpatialBandPoints(),
  };
}

export function createSpatialAdaptationCapability(): SpatialAdaptationCapability {
  return Object.fromEntries(SPATIAL_AXES.map((axis) => [
    axis,
    createAxisSpatialAdaptation(),
  ])) as SpatialAdaptationCapability;
}

export function cloneSpatialAdaptationCapability(
  capability: SpatialAdaptationCapability,
) {
  return mapSpatialAdaptationCapability(capability, (value) => value);
}

export function mapSpatialAdaptationCapability(
  capability: SpatialAdaptationCapability,
  map: (value: number) => number,
): SpatialAdaptationCapability {
  return Object.fromEntries(SPATIAL_AXES.map((axis) => [
    axis,
    Object.fromEntries(SPATIAL_ADAPTATION_ROUTES.map((route) => [
      route,
      Object.fromEntries(SPATIAL_BANDS.map((band) => [
        band,
        map(capability[axis][route][band]),
      ])),
    ])),
  ])) as SpatialAdaptationCapability;
}

export function addSpatialAdaptationCapability(
  left: SpatialAdaptationCapability,
  right: SpatialAdaptationCapability,
): SpatialAdaptationCapability {
  return Object.fromEntries(SPATIAL_AXES.map((axis) => [
    axis,
    Object.fromEntries(SPATIAL_ADAPTATION_ROUTES.map((route) => [
      route,
      Object.fromEntries(SPATIAL_BANDS.map((band) => [
        band,
        left[axis][route][band] + right[axis][route][band],
      ])),
    ])),
  ])) as SpatialAdaptationCapability;
}

export function flattenSpatialAdaptationCapability(
  capability: SpatialAdaptationCapability,
) {
  return SPATIAL_AXES.flatMap((axis) => (
    SPATIAL_ADAPTATION_ROUTES.flatMap((route) => (
      SPATIAL_BANDS.map((band) => capability[axis][route][band])
    ))
  ));
}
