import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { TaskGuideStepInfo } from '../../taskData/taskGuideTypes';
import './taskGuideInfoDialog.css';

export interface TaskGuideInfoSource {
  x: number;
  y: number;
}

interface TaskGuideInfoMotionRect {
  startHeight: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  targetHeight: number;
  targetLeft: number;
  targetTop: number;
  targetWidth: number;
}

interface TaskGuideInfoDialogProps {
  actionHint: string;
  actionTitle: string;
  guideTitle: string;
  info: TaskGuideStepInfo;
  motionKey: string;
  source?: TaskGuideInfoSource;
  variant?: 'step' | 'completion';
  onClose: () => void;
}

const START_WIDTH = 112;
const START_HEIGHT = 64;

export function TaskGuideInfoDialog({
  actionHint,
  actionTitle,
  guideTitle,
  info,
  motionKey,
  source,
  variant = 'step',
  onClose,
}: TaskGuideInfoDialogProps) {
  const [closing, setClosing] = useState(false);
  const [motionRect, setMotionRect] =
    useState<TaskGuideInfoMotionRect | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const illustration = info.illustration?.();
  const style = useMemo(() => (
    motionRect
      ? {
        '--task-guide-info-start-height': `${motionRect.startHeight}px`,
        '--task-guide-info-start-left': `${motionRect.startLeft}px`,
        '--task-guide-info-start-top': `${motionRect.startTop}px`,
        '--task-guide-info-start-width': `${motionRect.startWidth}px`,
        '--task-guide-info-target-height': `${motionRect.targetHeight}px`,
        '--task-guide-info-target-left': `${motionRect.targetLeft}px`,
        '--task-guide-info-target-top': `${motionRect.targetTop}px`,
        '--task-guide-info-target-width': `${motionRect.targetWidth}px`,
      } as CSSProperties
      : undefined
  ), [motionRect]);
  const close = () => {
    if (closing) return;

    setClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, 260);
  };

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const sourceX = source?.x ?? rect.left + rect.width / 2;
    const sourceY = source?.y ?? rect.top + rect.height / 2;

    setMotionRect({
      startHeight: START_HEIGHT,
      startLeft: sourceX - START_WIDTH / 2,
      startTop: sourceY - START_HEIGHT / 2,
      startWidth: START_WIDTH,
      targetHeight: rect.height,
      targetLeft: rect.left,
      targetTop: rect.top,
      targetWidth: rect.width,
    });
  }, [motionKey, source]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  return (
    <div
      className={`task-guide-info-backdrop ${closing ? 'closing' : ''}`}
      onMouseDown={close}
      role="presentation"
    >
      <section
        aria-modal="true"
        className={[
          'task-guide-info-dialog',
          motionRect ? 'motion-ready' : '',
          illustration ? 'with-illustration' : '',
          variant === 'completion' ? 'completion' : '',
        ].filter(Boolean).join(' ')}
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        style={style}
      >
        <div className="task-guide-info-content">
          {illustration ? (
            <div className="task-guide-info-illustrated">
              {illustration}
              <div className="task-guide-info-copy">
                <div className="task-guide-info-eyebrow">{guideTitle}</div>
                <h2>{info.title}</h2>
                <p>{info.body}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="task-guide-info-eyebrow">{guideTitle}</div>
              <h2>{info.title}</h2>
              <p>{info.body}</p>
            </>
          )}

          {variant === 'step' && (
            <div className="task-guide-info-action">
              <span>{actionTitle}</span>
              <p>{actionHint}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
