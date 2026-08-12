import type {
  AdaptationRequirementValue,
  DistanceIndexBand,
  KnowledgeAdaptationMatch,
  KnowledgeAdaptationPoints,
  KnowledgeAdaptationRequirements,
  KnowledgeAdaptationRoute,
  ReceptiveFieldBand,
} from './types';

type AdaptationBand = ReceptiveFieldBand | DistanceIndexBand;

export const RECEPTIVE_FIELD_BANDS = [
  'small',
  'medium',
  'large',
  'extraLarge',
  'global',
] as const;

export const DISTANCE_INDEX_BANDS = [
  'none',
  'short',
  'medium',
  'long',
  'global',
] as const;

export function createEmptyAdaptationPoints(): KnowledgeAdaptationPoints {
  return {
    receptiveField: {
      small: 0,
      medium: 0,
      large: 0,
      extraLarge: 0,
      global: 0,
    },
    distanceIndex: {
      none: 0,
      short: 0,
      medium: 0,
      long: 0,
      global: 0,
    },
  };
}

export function createEmptyAdaptationRequirements(): KnowledgeAdaptationRequirements {
  return createEmptyAdaptationPoints();
}

export function normalizeAdaptationRequirement(
  value: AdaptationRequirementValue,
): AdaptationRequirementValue {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

export function cloneAdaptationPoints(
  points: KnowledgeAdaptationPoints,
): KnowledgeAdaptationPoints {
  return {
    receptiveField: { ...points.receptiveField },
    distanceIndex: { ...points.distanceIndex },
  };
}

export function computeAdaptationMatch(
  capability: KnowledgeAdaptationPoints,
  requirements: KnowledgeAdaptationRequirements,
): KnowledgeAdaptationMatch {
  const receptiveField = routeMatch(
    capability,
    requirements,
    'receptiveField',
    RECEPTIVE_FIELD_BANDS,
  );
  const distanceIndex = routeMatch(
    capability,
    requirements,
    'distanceIndex',
    DISTANCE_INDEX_BANDS,
  );
  const hasReceptiveFieldRequirement = routeRequirementTotal(
    requirements,
    'receptiveField',
    RECEPTIVE_FIELD_BANDS,
  ) > 0;
  const hasDistanceIndexRequirement = routeRequirementTotal(
    requirements,
    'distanceIndex',
    DISTANCE_INDEX_BANDS,
  ) > 0;

  return {
    receptiveField,
    distanceIndex,
    combined: !hasReceptiveFieldRequirement && !hasDistanceIndexRequirement
      ? 1
      : 1 - (1 - receptiveField) * (1 - distanceIndex),
  };
}

export function readAdaptationPoint(
  points: KnowledgeAdaptationPoints,
  route: KnowledgeAdaptationRoute,
  band: AdaptationBand,
) {
  return (points[route] as Record<string, number>)[band] ?? 0;
}

function routeMatch(
  capability: KnowledgeAdaptationPoints,
  requirements: KnowledgeAdaptationRequirements,
  route: KnowledgeAdaptationRoute,
  bands: readonly AdaptationBand[],
) {
  const required = routeRequirementTotal(requirements, route, bands);
  if (required <= 0) return 0;
  const covered = bands.reduce((sum, band) => (
    sum + Math.min(
      readAdaptationPoint(capability, route, band),
      readAdaptationPoint(requirements, route, band),
    )
  ), 0);
  return Math.max(0, Math.min(1, covered / required));
}

function routeRequirementTotal(
  requirements: KnowledgeAdaptationRequirements,
  route: KnowledgeAdaptationRoute,
  bands: readonly AdaptationBand[],
) {
  return bands.reduce(
    (sum, band) => sum + readAdaptationPoint(requirements, route, band),
    0,
  );
}
