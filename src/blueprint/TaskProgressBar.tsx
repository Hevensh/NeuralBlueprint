import type { EvaluatedTaskGuide } from './taskGuide/evaluateTaskGuide';

type TaskProgressStep = {
  key: string;
  title: string;
  description: string;
  state: 'complete' | 'active' | 'pending';
};

interface TaskProgressBarProps {
  guide: EvaluatedTaskGuide;
}

export function TaskProgressBar({ guide }: TaskProgressBarProps) {
  const steps: TaskProgressStep[] = guide.steps.map((step) => ({
    key: step.id,
    title: step.title,
    description: step.description ?? step.hint,
    state: step.completed
      ? 'complete' as const
      : step.active
        ? 'active' as const
        : 'pending' as const,
  }));
  const progress = guide.progressRatio * 100;
  const hint = guide.activeStep
    ? guide.completedStepCount === guide.steps.length
      ? 'Current level completed.'
      : guide.activeStep.hint
    : null;

  return (
    <nav
      aria-label="Task progress"
      className="task-progress-bar"
    >
      <div className="task-progress-panel">
        <div className="task-progress-track">
          <div
            className="task-progress-track-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="task-progress-steps">
          {steps.map((step) => (
            <li
              className={`task-progress-step ${step.state}`}
              key={step.key}
            >
              <span className="task-progress-dot" />
              <span className="task-progress-text">
                <span className="task-progress-title">{step.title}</span>
                <span className="task-progress-description">
                  {step.description}
                </span>
              </span>
            </li>
          ))}
        </ol>

        {hint && (
          <div className="task-progress-hint">
            {hint}
          </div>
        )}
      </div>
    </nav>
  );
}
