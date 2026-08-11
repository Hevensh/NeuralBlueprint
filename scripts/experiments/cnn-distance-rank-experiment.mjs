import assert from 'node:assert/strict';

const BAND_NAMES = ['none', 'short', 'medium', 'long'];

function totalRank(profile) {
  return BAND_NAMES.reduce((sum, name) => sum + profile[name], 0);
}

function normalizeProfile(profile) {
  return Object.fromEntries(BAND_NAMES.map((name) => [
    name,
    Math.max(0, Number.isFinite(profile[name]) ? profile[name] : 0),
  ]));
}

function moveRank(profile, source, target, amount) {
  const moved = Math.min(profile[source], Math.max(0, amount));
  profile[source] -= moved;
  profile[target] += moved;
  return moved;
}

/**
 * Experimental CNN distance-rank ladder.
 *
 * Assumptions under test:
 * - none/short/medium/long are mutually exclusive rank bands.
 * - Their sum equals the current output effective rank.
 * - Newly created effective rank starts in none.
 * - A spatial CNN can upgrade none to short.
 * - Medium and long values are promotion budgets, not independent ranks.
 */
function applyCnnDistanceStep(input, options) {
  const output = normalizeProfile(input);
  const inputTotal = totalRank(output);
  const outputEffectiveRank = Math.max(0, options.outputEffectiveRank);

  if (outputEffectiveRank < inputTotal) {
    compressToRank(output, outputEffectiveRank);
  } else {
    output.none += outputEffectiveRank - inputTotal;
  }

  const shortPromotion = options.hasSpatialReach
    ? moveRank(output, 'none', 'short', Number.POSITIVE_INFINITY)
    : 0;
  const mediumPromotion = moveRank(
    output,
    'short',
    'medium',
    options.mediumPromotion ?? 0,
  );
  const longPromotion = moveRank(
    output,
    'medium',
    'long',
    options.longPromotion ?? 0,
  );

  return {
    profile: output,
    promotions: {
      short: shortPromotion,
      medium: mediumPromotion,
      long: longPromotion,
    },
  };
}

function compressToRank(profile, targetRank) {
  let overflow = totalRank(profile) - targetRank;
  for (const band of BAND_NAMES) {
    if (overflow <= 0) return;
    const removed = Math.min(profile[band], overflow);
    profile[band] -= removed;
    overflow -= removed;
  }
}

function printScenario(label, input, steps) {
  let current = normalizeProfile(input);
  console.log(`\n${label}`);
  console.table([{ step: 'input', ...current, total: totalRank(current) }]);

  steps.forEach((step, index) => {
    const result = applyCnnDistanceStep(current, step);
    current = result.profile;
    console.table([{
      step: `${index + 1}: ${step.label}`,
      ...current,
      total: totalRank(current),
      promotedShort: result.promotions.short,
      promotedMedium: result.promotions.medium,
      promotedLong: result.promotions.long,
    }]);
  });
}

function assertProfile(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  assert.equal(
    totalRank(actual),
    totalRank(expected),
    `${label}: total rank must be conserved`,
  );
}

const correctedExample = applyCnnDistanceStep(
  { none: 6, short: 0, medium: 0, long: 0 },
  {
    outputEffectiveRank: 18,
    hasSpatialReach: true,
  },
);
assertProfile(
  correctedExample.profile,
  { none: 0, short: 18, medium: 0, long: 0 },
  'corrected example',
);

const promotionExample = applyCnnDistanceStep(
  { none: 6, short: 0, medium: 0, long: 0 },
  {
    outputEffectiveRank: 18,
    hasSpatialReach: true,
    mediumPromotion: 4,
    longPromotion: 1,
  },
);
assertProfile(
  promotionExample.profile,
  { none: 0, short: 14, medium: 3, long: 1 },
  'promotion ladder example',
);

printScenario(
  'Probe A - the corrected 6 none -> 18 short example',
  { none: 6, short: 0, medium: 0, long: 0 },
  [{
    label: 'local CNN, output effective rank 18',
    outputEffectiveRank: 18,
    hasSpatialReach: true,
  }],
);

printScenario(
  'Probe B - interpret +4 medium / +1 long as promotions',
  { none: 6, short: 0, medium: 0, long: 0 },
  [{
    label: 'local CNN, then promote 4 medium and 1 long',
    outputEffectiveRank: 18,
    hasSpatialReach: true,
    mediumPromotion: 4,
    longPromotion: 1,
  }],
);

printScenario(
  'Probe C - stacking grows distance by repeated promotion',
  { none: 6, short: 0, medium: 0, long: 0 },
  [
    {
      label: 'CNN block 1',
      outputEffectiveRank: 18,
      hasSpatialReach: true,
      mediumPromotion: 4,
      longPromotion: 1,
    },
    {
      label: 'CNN block 2',
      outputEffectiveRank: 24,
      hasSpatialReach: true,
      mediumPromotion: 6,
      longPromotion: 2,
    },
  ],
);

printScenario(
  'Probe D - 1x1 CNN creates rank but no distance upgrade',
  { none: 6, short: 0, medium: 0, long: 0 },
  [{
    label: '1x1 CNN, output effective rank 18',
    outputEffectiveRank: 18,
    hasSpatialReach: false,
  }],
);
