import type {
  DistributionSupportPoint,
  ModuleDistributionStats,
} from '../../ModuleBaseNodeTypes';

const PROBABILITY_EPSILON = 1e-15;
const VALUE_EPSILON = 1e-12;
const WITHIN_SIDE_VARIANCE_SHARE = 1 - 2 / Math.PI;

export function ensureDistributionSupport(
  distribution: ModuleDistributionStats,
) {
  return normalizeSupport(
    distribution.support?.length
      ? distribution.support
      : createMomentMatchedSupport(distribution),
  );
}

export function summarizeDistributionSupport(
  supportInput: DistributionSupportPoint[],
): ModuleDistributionStats {
  const support = normalizeSupport(supportInput);
  const mean = support.reduce(
    (sum, point) => sum + point.value * point.probability,
    0,
  );
  const secondMoment = support.reduce(
    (sum, point) => sum + point.value ** 2 * point.probability,
    0,
  );

  return {
    mean,
    variance: Math.max(secondMoment - mean ** 2, 0),
    zeroRate: support.reduce(
      (sum, point) => sum + (point.value === 0 ? point.probability : 0),
      0,
    ),
    negativeRate: support.reduce(
      (sum, point) => sum + (point.value < 0 ? point.probability : 0),
      0,
    ),
    support,
  };
}

export function reluDistribution(
  distribution: ModuleDistributionStats,
) {
  return summarizeDistributionSupport(
    ensureDistributionSupport(distribution).map((point) => ({
      value: Math.max(point.value, 0),
      probability: point.probability,
    })),
  );
}

export function dropoutDistribution(
  distribution: ModuleDistributionStats,
  dropoutRateInput: number,
) {
  const dropoutRate = clampProbability(dropoutRateInput);
  const keepRate = 1 - dropoutRate;
  return summarizeDistributionSupport([
    ...ensureDistributionSupport(distribution).map((point) => ({
      value: point.value,
      probability: point.probability * keepRate,
    })),
    { value: 0, probability: dropoutRate },
  ]);
}

export function maxPoolDistribution(
  distribution: ModuleDistributionStats,
  elementCountInput: number,
) {
  const elementCount = Math.max(1, Math.round(elementCountInput));
  const support = ensureDistributionSupport(distribution);
  let cumulativeProbability = 0;

  return summarizeDistributionSupport(support.map((point) => {
    const previousCumulative = cumulativeProbability;
    cumulativeProbability += point.probability;
    return {
      value: point.value,
      probability: Math.max(
        cumulativeProbability ** elementCount
          - previousCumulative ** elementCount,
        0,
      ),
    };
  }));
}

function createMomentMatchedSupport(
  distribution: ModuleDistributionStats,
) {
  const zeroRate = clampProbability(distribution.zeroRate);
  const negativeRate = Math.min(
    clampProbability(distribution.negativeRate ?? 0),
    1 - zeroRate,
  );
  const positiveRate = Math.max(1 - zeroRate - negativeRate, 0);
  const nonZeroRate = negativeRate + positiveRate;
  const mean = Number.isFinite(distribution.mean) ? distribution.mean : 0;
  const variance = Number.isFinite(distribution.variance)
    ? Math.max(distribution.variance, 0)
    : 0;
  const secondMoment = Math.max(
    variance + mean ** 2,
    nonZeroRate > PROBABILITY_EPSILON
      ? mean ** 2 / nonZeroRate
      : 0,
  );
  const support: DistributionSupportPoint[] = zeroRate > PROBABILITY_EPSILON
    ? [{ value: 0, probability: zeroRate }]
    : [];

  if (nonZeroRate <= PROBABILITY_EPSILON) {
    return [{ value: 0, probability: 1 }];
  }
  if (negativeRate <= PROBABILITY_EPSILON) {
    support.push(...createSignedSideSupport(
      positiveRate,
      mean / positiveRate,
      secondMoment / positiveRate,
      1,
    ));
    return support;
  }
  if (positiveRate <= PROBABILITY_EPSILON) {
    support.push(...createSignedSideSupport(
      negativeRate,
      -mean / negativeRate,
      secondMoment / negativeRate,
      -1,
    ));
    return support;
  }

  const minimumGroupSecondMoment = mean ** 2 / nonZeroRate;
  const availableSpread = Math.max(
    secondMoment - minimumGroupSecondMoment,
    0,
  );
  let betweenSideSecondMoment = secondMoment
    - availableSpread * WITHIN_SIDE_VARIANCE_SHARE;
  let sideMeans = getSideMeans(
    mean,
    betweenSideSecondMoment,
    negativeRate,
    positiveRate,
  );
  if (!sideMeans) {
    betweenSideSecondMoment = secondMoment;
    sideMeans = getSideMeans(
      mean,
      betweenSideSecondMoment,
      negativeRate,
      positiveRate,
    );
  }
  if (!sideMeans) {
    return createFallbackSignedSupport(
      mean,
      secondMoment,
      zeroRate,
      negativeRate,
      positiveRate,
    );
  }

  const withinSideVariance = Math.max(
    (secondMoment - betweenSideSecondMoment) / nonZeroRate,
    0,
  );
  support.push(...createSignedSideSupport(
    negativeRate,
    sideMeans.negativeMagnitude,
    sideMeans.negativeMagnitude ** 2 + withinSideVariance,
    -1,
  ));
  support.push(...createSignedSideSupport(
    positiveRate,
    sideMeans.positiveMagnitude,
    sideMeans.positiveMagnitude ** 2 + withinSideVariance,
    1,
  ));
  return support;
}

function getSideMeans(
  mean: number,
  groupSecondMoment: number,
  negativeRate: number,
  positiveRate: number,
) {
  const nonZeroRate = negativeRate + positiveRate;
  const discriminant = nonZeroRate * groupSecondMoment - mean ** 2;
  if (discriminant < -PROBABILITY_EPSILON) return null;

  const distance = Math.sqrt(
    Math.max(discriminant, 0) / (negativeRate * positiveRate),
  );
  const negativeMagnitude = (
    positiveRate * distance - mean
  ) / nonZeroRate;
  const positiveMagnitude = (
    mean + negativeRate * distance
  ) / nonZeroRate;
  if (
    negativeMagnitude <= VALUE_EPSILON
    || positiveMagnitude <= VALUE_EPSILON
  ) return null;

  return { negativeMagnitude, positiveMagnitude };
}

function createSignedSideSupport(
  totalProbability: number,
  meanMagnitudeInput: number,
  secondMomentMagnitudeInput: number,
  sign: -1 | 1,
) {
  if (totalProbability <= PROBABILITY_EPSILON) return [];

  const meanMagnitude = Math.max(meanMagnitudeInput, VALUE_EPSILON);
  const variance = Math.max(
    secondMomentMagnitudeInput - meanMagnitude ** 2,
    0,
  );
  if (variance <= VALUE_EPSILON ** 2) {
    return [{
      value: sign * meanMagnitude,
      probability: totalProbability,
    }];
  }

  const lowerMagnitude = Math.min(
    Math.max(meanMagnitude * 1e-6, VALUE_EPSILON),
    meanMagnitude / 2,
  );
  const centeredMean = meanMagnitude - lowerMagnitude;
  const successProbability = centeredMean ** 2 / (
    centeredMean ** 2 + 3 * variance
  );
  const step = centeredMean / Math.max(3 * successProbability, VALUE_EPSILON);
  const failureProbability = 1 - successProbability;
  const probabilities = [
    failureProbability ** 3,
    3 * successProbability * failureProbability ** 2,
    3 * successProbability ** 2 * failureProbability,
    successProbability ** 3,
  ];

  return probabilities.map((probability, index) => ({
    value: sign * (lowerMagnitude + index * step),
    probability: totalProbability * probability,
  }));
}

function createFallbackSignedSupport(
  mean: number,
  secondMoment: number,
  zeroRate: number,
  negativeRate: number,
  positiveRate: number,
) {
  const scale = Math.sqrt(
    secondMoment / Math.max(negativeRate + positiveRate, PROBABILITY_EPSILON),
  );
  const support: DistributionSupportPoint[] = [];
  if (negativeRate > PROBABILITY_EPSILON) {
    support.push({ value: -Math.max(scale, VALUE_EPSILON), probability: negativeRate });
  }
  if (zeroRate > PROBABILITY_EPSILON) {
    support.push({ value: 0, probability: zeroRate });
  }
  if (positiveRate > PROBABILITY_EPSILON) {
    const positiveValue = positiveRate > PROBABILITY_EPSILON
      ? Math.max((mean + negativeRate * scale) / positiveRate, VALUE_EPSILON)
      : scale;
    support.push({ value: positiveValue, probability: positiveRate });
  }
  return support;
}

function normalizeSupport(
  supportInput: DistributionSupportPoint[],
) {
  const merged = new Map<number, number>();
  supportInput.forEach(({ value, probability }) => {
    if (!Number.isFinite(value) || !Number.isFinite(probability)) return;
    if (probability <= PROBABILITY_EPSILON) return;
    merged.set(value, (merged.get(value) ?? 0) + probability);
  });
  if (merged.size === 0) {
    return [{ value: 0, probability: 1 }];
  }

  const totalProbability = [...merged.values()].reduce(
    (sum, probability) => sum + probability,
    0,
  );
  return [...merged.entries()]
    .map(([value, probability]) => ({
      value,
      probability: probability / totalProbability,
    }))
    .sort((left, right) => left.value - right.value);
}

function clampProbability(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}
