import { useLanguage } from '../i18n/LanguageContext';
import { getAcademicTime } from './academicTime';

export function AcademicTimeIndicator({ day }: { day: number }) {
  const { labels, language } = useLanguage();
  const time = getAcademicTime(day);
  const semester = language === 'zh'
    ? `第${time.semester}学期`
    : `${labels.academicTime.semester} ${time.semester}`;
  const week = language === 'zh'
    ? `第${time.week}周`
    : `${labels.academicTime.week} ${time.week}`;
  const clock = `${pad(time.hour)}:${pad(time.minute)}`;

  return (
    <div className="academic-time-indicator">
      <span>{semester}</span>
      <span>{week}</span>
      <span>{labels.academicTime.weekdays[time.weekday]}</span>
      <span>{clock}</span>
    </div>
  );
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}
