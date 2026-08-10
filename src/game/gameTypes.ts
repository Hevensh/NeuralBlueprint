import type { LabProgress } from '../lab/labTypes';

export interface GameTime {
  day: number;
  minuteOfDay: number;
}

export interface GameProgress {
  seed: string;
  time: GameTime;
  lab: LabProgress;
}
