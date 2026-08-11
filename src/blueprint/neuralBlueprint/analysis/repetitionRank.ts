import type {
  ModuleStats,
  RepetitionRank,
  RepetitionStats,
} from '../ModuleBaseNodeTypes';

export const EMPTY_REPETITION_RANK: RepetitionRank = {
  small: 0,
  medium: 0,
  large: 0,
  extraLarge: 0,
  global: 0,
};

export function createEmptyRepetitionStats(): RepetitionStats {
  return {
    potential: { ...EMPTY_REPETITION_RANK },
    effective: { ...EMPTY_REPETITION_RANK },
    memory: { ...EMPTY_REPETITION_RANK },
  };
}

export function preserveRepetitionStats(
  stats: Pick<ModuleStats, 'adaptation'>,
  effectiveRank: number,
) {
  return createRepetitionStats(
    stats.adaptation.repetition.potential,
    effectiveRank,
  );
}

export function cnnRepetitionStats(
  input: ModuleStats,
  outputEffectiveRank: number,
  kernelSize: number,
) {
  const previous = input.adaptation.repetition.potential;
  const span = Math.max(1, Math.round(kernelSize));
  const mediumMix = Math.min(0.5, Math.max(0, span - 1) / 8);
  const largeMix = Math.min(0.25, Math.max(0, span - 1) / 16);
  const potential = {
    small: Math.max(previous.small, Math.max(outputEffectiveRank, 0)),
    medium: previous.medium + mediumMix * Math.max(
      previous.small - previous.medium,
      0,
    ),
    large: previous.large + largeMix * Math.max(
      previous.medium - previous.large,
      0,
    ),
    extraLarge: previous.extraLarge,
    global: previous.global,
  };

  return createRepetitionStats(potential, outputEffectiveRank);
}

export function poolRepetitionStats(
  input: ModuleStats,
  kernelSize: number,
  outputEffectiveRank = input.rank.effectiveRank,
) {
  const previous = input.adaptation.repetition.potential;
  const mix = Math.min(0.5, Math.max(0, kernelSize - 1) / 4);
  const potential = {
    small: previous.small * (1 - 0.5 * mix),
    medium: previous.medium + mix * Math.max(
      previous.small - previous.medium,
      0,
    ),
    large: previous.large + 0.5 * mix * Math.max(
      previous.medium - previous.large,
      0,
    ),
    extraLarge: previous.extraLarge,
    global: previous.global,
  };

  return createRepetitionStats(potential, outputEffectiveRank);
}

export function maxRepetitionStats(
  inputs: ModuleStats[],
  outputEffectiveRank: number,
) {
  const potential = inputs.reduce<RepetitionRank>((result, input) => {
    const rank = input.adaptation.repetition.potential;
    return {
      small: Math.max(result.small, rank.small),
      medium: Math.max(result.medium, rank.medium),
      large: Math.max(result.large, rank.large),
      extraLarge: Math.max(result.extraLarge, rank.extraLarge),
      global: Math.max(result.global, rank.global),
    };
  }, { ...EMPTY_REPETITION_RANK });

  return createRepetitionStats(potential, outputEffectiveRank);
}

export function applyRepetitionMemory(
  stats: ModuleStats,
  backwardEffectiveRank: number,
) {
  const learnableRank = Math.max(
    Number.isFinite(backwardEffectiveRank) ? backwardEffectiveRank : 0,
    0,
  );
  const effective = stats.adaptation.repetition.effective;
  stats.adaptation.repetition.memory = {
    small: effective.small * learnableRank,
    medium: effective.medium * learnableRank,
    large: effective.large * learnableRank,
    extraLarge: effective.extraLarge * learnableRank,
    global: effective.global * learnableRank,
  };
}

function createRepetitionStats(
  potentialInput: RepetitionRank,
  effectiveRank: number,
): RepetitionStats {
  const potential = {
    small: sanitizeRank(potentialInput.small),
    medium: sanitizeRank(potentialInput.medium),
    large: sanitizeRank(potentialInput.large),
    extraLarge: sanitizeRank(potentialInput.extraLarge),
    global: sanitizeRank(potentialInput.global),
  };
  const limit = Math.max(Number.isFinite(effectiveRank) ? effectiveRank : 0, 0);
  return {
    potential,
    effective: {
      small: Math.min(potential.small, limit),
      medium: Math.min(potential.medium, limit),
      large: Math.min(potential.large, limit),
      extraLarge: Math.min(potential.extraLarge, limit),
      global: Math.min(potential.global, limit),
    },
    memory: { ...EMPTY_REPETITION_RANK },
  };
}

function sanitizeRank(value: number) {
  return Math.max(Number.isFinite(value) ? value : 0, 0);
}
