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

export function getAcademicTime(day: number): AcademicTime {
  const dayIndex = Math.max(0, Math.floor(day) - 1);
  const semesterDay = dayIndex % (DAYS_PER_WEEK * WEEKS_PER_SEMESTER);
  return {
    semester: Math.floor(dayIndex / (DAYS_PER_WEEK * WEEKS_PER_SEMESTER)) + 1,
    week: Math.floor(semesterDay / DAYS_PER_WEEK) + 1,
    weekday: ACADEMIC_WEEKDAYS[semesterDay % DAYS_PER_WEEK],
    hour: 9,
    minute: 0,
  };
}
