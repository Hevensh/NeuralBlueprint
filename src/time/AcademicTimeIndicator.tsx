import type { GameTime } from '../game/gameTypes';
import { useLanguage } from '../i18n/useLanguage';
import { getAcademicTime } from './academicTime';

export function AcademicTimeIndicator({ time }: { time: GameTime }) {
  const { labels, language } = useLanguage();
  const academicTime = getAcademicTime(time);
  const semester = language === 'zh'
    ? `第${academicTime.semester}学期`
    : `${labels.academicTime.semester} ${academicTime.semester}`;
  const week = language === 'zh'
    ? `第${academicTime.week}周`
    : `${labels.academicTime.week} ${academicTime.week}`;
  const clock = `${pad(academicTime.hour)}:${pad(academicTime.minute)}`;

  return (
    <div className="academic-time-indicator">
      <span>{semester}</span>
      <span>{week}</span>
      <span>{labels.academicTime.weekdays[academicTime.weekday]}</span>
      <span>{clock}</span>
    </div>
  );
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}
