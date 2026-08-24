const MIN_VARIANCE_COMPONENT = 1e-12;
const VARIANCE_LOG_DISTANCE_SIGMOID_CENTER = 2;
const VARIANCE_LOG_DISTANCE_SIGMOID_STEEPNESS = Math.log(99);

export type VarianceDisplayTone =
  | 'unknown'
  | 'danger'
  | 'warning'
  | 'stable';

const DISPLAY_WARNING_LOG_DISTANCE = 1;
const DISPLAY_DANGER_LOG_DISTANCE = 2;

export function computeVarianceLogDistance(
  forwardVariance: unknown,
  backwardVariance: unknown,
) {
  if (
    !isFiniteNumber(forwardVariance)
    || !isFiniteNumber(backwardVariance)
  ) return 0;

  if (forwardVariance === 0 && backwardVariance === 0) return 0;

  const safeForwardVariance = Math.max(
    MIN_VARIANCE_COMPONENT,
    Math.max(0, forwardVariance),
  );
  const safeBackwardVariance = Math.max(
    MIN_VARIANCE_COMPONENT,
    Math.max(0, backwardVariance),
  );

  return Math.abs(
    Math.log10(safeForwardVariance / safeBackwardVariance),
  );
}

export function varianceLogDistanceToLearningFactor(
  varianceLogDistance: number | undefined,
) {
  const logDistance = Number.isFinite(varianceLogDistance)
    ? Math.max(0, varianceLogDistance as number)
    : 0;

  return 1 / (
    1
    + Math.exp(
      VARIANCE_LOG_DISTANCE_SIGMOID_STEEPNESS
      * (logDistance - VARIANCE_LOG_DISTANCE_SIGMOID_CENTER),
    )
  );
}

export function standardDeviationDisplayTone(
  value: number | null | undefined,
): VarianceDisplayTone {
  if (!isFiniteNumber(value)) return 'unknown';
  const logDistance = value > 0
    ? Math.abs(Math.log10(value))
    : Number.POSITIVE_INFINITY;
  return logDistanceDisplayTone(logDistance);
}

export function varianceRatioDisplayTone(
  value: number | null | undefined,
): VarianceDisplayTone {
  if (!isFiniteNumber(value) || value < 0) return 'unknown';
  const logDistance = value > 0
    ? Math.abs(Math.log10(value))
    : Number.POSITIVE_INFINITY;
  return logDistanceDisplayTone(logDistance);
}

function logDistanceDisplayTone(logDistance: number): VarianceDisplayTone {
  if (logDistance >= DISPLAY_DANGER_LOG_DISTANCE) return 'danger';
  if (logDistance >= DISPLAY_WARNING_LOG_DISTANCE) return 'warning';
  return 'stable';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
