import {
  SPATIAL_ADAPTATION_ROUTES,
  SPATIAL_AXES,
  SPATIAL_BANDS,
  addSpatialAdaptationCapability,
  cloneSpatialAdaptationCapability,
  createAxisSpatialAdaptation,
  createSpatialAdaptationCapability,
  createSpatialBandPoints,
  type AxisSpatialAdaptation,
  type SpatialAdaptationCapability,
  type SpatialAdaptationRoute,
  type SpatialAxis,
  type SpatialBand,
} from '../../SpatialAdaptationTypes';
import type {
  AdaptationRequirementValue,
  KnowledgeAdaptationBalance,
  KnowledgeAdaptationRequirements,
} from './types';

const MIN_RATIO = 0.01;
const MAX_RATIO = 2;
const GAP_MAX_WEIGHT = 0.75;
const GAP_MEAN_WEIGHT = 0.25;
const SURPLUS_MAX_WEIGHT = 0.5;
const SURPLUS_MEAN_WEIGHT = 0.5;
const MAX_SURPLUS_LOG_BONUS = Math.log2(1.1);

export { SPATIAL_ADAPTATION_ROUTES, SPATIAL_AXES, SPATIAL_BANDS };
export type { SpatialAdaptationRoute, SpatialAxis, SpatialBand };

export const createEmptyBandPoints = createSpatialBandPoints;
export const createEmptyAxisAdaptation = createAxisSpatialAdaptation;
export const createEmptyAdaptationCapability =
  createSpatialAdaptationCapability;

export function createEmptyAdaptationRequirements(): KnowledgeAdaptationRequirements {
  return {};
}

export function normalizeAdaptationRequirement(
  value: AdaptationRequirementValue,
): AdaptationRequirementValue {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

export function cloneAdaptationCapability(
  capability: SpatialAdaptationCapability,
): SpatialAdaptationCapability {
  return cloneSpatialAdaptationCapability(capability);
}

export function cloneAdaptationRequirements(
  requirements: KnowledgeAdaptationRequirements,
): KnowledgeAdaptationRequirements {
  const cloned = Object.fromEntries(
    SPATIAL_AXES.flatMap((axis) => {
      const requirement = requirements[axis];
      return requirement
        ? [[axis, cloneAxisAdaptation(requirement)]]
        : [];
    }),
  ) as KnowledgeAdaptationRequirements;
  if (typeof requirements.complexity === 'number') {
    cloned.complexity = normalizeAdaptationRequirement(requirements.complexity);
  }
  return cloned;
}

export function computeAdaptationBalance(
  capability: SpatialAdaptationCapability,
  requirements: KnowledgeAdaptationRequirements,
  complexityCapability = 0,
): KnowledgeAdaptationBalance {
  const cells = SPATIAL_AXES.flatMap((axis) => {
    const axisRequirement = requirements[axis];
    if (!axisRequirement) return [];

    return SPATIAL_ADAPTATION_ROUTES.flatMap((route) => (
      SPATIAL_BANDS.flatMap((band) => {
        const requirement = sanitizePoint(axisRequirement[route][band]);
        if (requirement <= 0) return [];
        const available = sanitizePoint(capability[axis][route][band]);
        const ratio = clamp(available / requirement, MIN_RATIO, MAX_RATIO);
        const signed = Math.log2(ratio);
        return [{
          requirement,
          gap: Math.max(0, -signed),
          surplus: Math.max(0, signed),
        }];
      })
    ));
  });

  const complexityRequirement = sanitizePoint(requirements.complexity ?? 0);
  if (complexityRequirement > 0) {
    const ratio = clamp(
      sanitizePoint(complexityCapability) / complexityRequirement,
      MIN_RATIO,
      MAX_RATIO,
    );
    const signed = Math.log2(ratio);
    cells.push({
      requirement: complexityRequirement,
      gap: Math.max(0, -signed),
      surplus: Math.max(0, signed),
    });
  }

  if (cells.length === 0) return neutralAdaptationBalance();

  const totalWeight = cells.reduce(
    (sum, cell) => sum + cell.requirement,
    0,
  );
  const maxGap = Math.max(...cells.map((cell) => cell.gap));
  const meanGap = weightedMean(cells, totalWeight, 'gap');
  const maxSurplus = Math.max(...cells.map((cell) => cell.surplus));
  const meanSurplus = weightedMean(cells, totalWeight, 'surplus');
  const gapScore = GAP_MAX_WEIGHT * maxGap + GAP_MEAN_WEIGHT * meanGap;
  const surplusScore = SURPLUS_MAX_WEIGHT * maxSurplus
    + SURPLUS_MEAN_WEIGHT * meanSurplus;
  const balance = -gapScore + MAX_SURPLUS_LOG_BONUS * surplusScore;

  return {
    comparedCellCount: cells.length,
    maxGap,
    meanGap,
    maxSurplus,
    meanSurplus,
    balance,
    factor: 2 ** balance,
  };
}

export function addAdaptationCapability(
  left: SpatialAdaptationCapability,
  right: SpatialAdaptationCapability,
): SpatialAdaptationCapability {
  return addSpatialAdaptationCapability(left, right);
}

function neutralAdaptationBalance(): KnowledgeAdaptationBalance {
  return {
    comparedCellCount: 0,
    maxGap: 0,
    meanGap: 0,
    maxSurplus: 0,
    meanSurplus: 0,
    balance: 0,
    factor: 1,
  };
}

function cloneAxisAdaptation(
  adaptation: AxisSpatialAdaptation,
): AxisSpatialAdaptation {
  return {
    scale: { ...adaptation.scale },
    index: { ...adaptation.index },
  };
}

function weightedMean(
  cells: Array<{ requirement: number; gap: number; surplus: number }>,
  totalWeight: number,
  key: 'gap' | 'surplus',
) {
  return totalWeight > 0
    ? cells.reduce((sum, cell) => sum + cell[key] * cell.requirement, 0)
      / totalWeight
    : 0;
}

function sanitizePoint(value: number) {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
