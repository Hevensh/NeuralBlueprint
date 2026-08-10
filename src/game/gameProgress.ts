import { DEFAULT_LAB_DAY_CONFIG } from '../lab/labNpcRegistry';
import { createInitialLabProgress } from '../lab/labProgress';
import type { GameProgress } from './gameTypes';

const START_MINUTE_OF_DAY = 9 * 60;

export function createInitialGameProgress(): GameProgress {
  const seed = String(Date.now());
  const time = { day: 1, minuteOfDay: START_MINUTE_OF_DAY };

  return {
    seed,
    time,
    lab: createInitialLabProgress(DEFAULT_LAB_DAY_CONFIG, `${seed}:lab`, time.day),
  };
}
