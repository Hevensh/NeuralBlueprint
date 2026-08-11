import type {
  ModuleStats,
  RepetitionRank,
} from '../ModuleBaseNodeTypes';

const EMPTY_REPETITION_RANK: RepetitionRank = {
  high: 0,
  medium: 0,
  low: 0,
};

export function readRepetitionRank(
  stats: Pick<ModuleStats, 'repetitionRank'>,
): RepetitionRank {
  return stats.repetitionRank ?? EMPTY_REPETITION_RANK;
}

export function preserveRepetitionRank(
  stats: Pick<ModuleStats, 'repetitionRank'>,
  effectiveRank: number,
): RepetitionRank {
  const input = readRepetitionRank(stats);
  return {
    high: capRank(input.high, effectiveRank),
    medium: capRank(input.medium, effectiveRank),
    low: capRank(input.low, effectiveRank),
  };
}

export function cnnRepetitionRank(
  input: ModuleStats,
  outputEffectiveRank: number,
  kernelSize: number,
): RepetitionRank {
  const previous = readRepetitionRank(input);
  const span = Math.max(1, Math.round(kernelSize));
  const mediumMix = Math.min(0.5, Math.max(0, span - 1) / 8);
  const lowMix = Math.min(0.25, Math.max(0, span - 3) / 16);

  return {
    high: capRank(Math.max(previous.high, outputEffectiveRank), outputEffectiveRank),
    medium: capRank(
      previous.medium + previous.high * mediumMix,
      outputEffectiveRank,
    ),
    low: capRank(
      previous.low + previous.medium * lowMix,
      outputEffectiveRank,
    ),
  };
}

export function poolRepetitionRank(
  input: ModuleStats,
  kernelSize: number,
  outputEffectiveRank = input.effectiveRank,
): RepetitionRank {
  const previous = readRepetitionRank(input);
  const mix = Math.min(0.5, Math.max(0, kernelSize - 1) / 4);
  return {
    high: capRank(previous.high * (1 - 0.5 * mix), outputEffectiveRank),
    medium: capRank(
      previous.medium + previous.high * mix,
      outputEffectiveRank,
    ),
    low: capRank(
      previous.low + previous.medium * mix * 0.5,
      outputEffectiveRank,
    ),
  };
}

export function maxRepetitionRank(inputs: ModuleStats[]): RepetitionRank {
  return inputs.reduce<RepetitionRank>((result, input) => {
    const rank = readRepetitionRank(input);
    return {
      high: Math.max(result.high, rank.high),
      medium: Math.max(result.medium, rank.medium),
      low: Math.max(result.low, rank.low),
    };
  }, { ...EMPTY_REPETITION_RANK });
}

function capRank(value: number, effectiveRank: number) {
  return Math.max(0, Math.min(value, Math.max(0, effectiveRank)));
}
