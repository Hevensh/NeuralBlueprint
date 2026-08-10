const DAYS_PER_WEEK = 7;
const WEEKS_PER_SEMESTER = 20;

export const ACADEMIC_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export interface AcademicTime {
  semester: number;
  week: number;
  weekday: (typeof ACADEMIC_WEEKDAYS)[number];
  hour: number;
  minute: number;
}

export function getAcademicTime(time: GameTime): AcademicTime {
  const dayIndex = Math.max(0, Math.floor(time.day) - 1);
  const minuteOfDay = Math.max(0, Math.floor(time.minuteOfDay));
  const semesterDay = dayIndex % (DAYS_PER_WEEK * WEEKS_PER_SEMESTER);
  return {
    semester: Math.floor(dayIndex / (DAYS_PER_WEEK * WEEKS_PER_SEMESTER)) + 1,
    week: Math.floor(semesterDay / DAYS_PER_WEEK) + 1,
    weekday: ACADEMIC_WEEKDAYS[semesterDay % DAYS_PER_WEEK],
    hour: Math.floor(minuteOfDay / 60) % 24,
    minute: minuteOfDay % 60,
  };
}
import type { GameTime } from '../game/gameTypes';
