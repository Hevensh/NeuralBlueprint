import type { EvaluatedTaskGuide } from './taskGuide/evaluateTaskGuide';
import type { TaskGuideInfoSource } from './taskGuide/TaskGuideInfoDialog';

type TaskProgressStep = {
  key: string;
  title: string;
  description: string;
  state: 'complete' | 'active' | 'pending';
};

interface TaskProgressBarProps {
  guide: EvaluatedTaskGuide;
  onCompletionInfoRequest?: (source?: TaskGuideInfoSource) => void;
  onStepInfoRequest?: (
    stepId: string,
    source?: TaskGuideInfoSource,
  ) => void;
}

export function TaskProgressBar({
  guide,
  onCompletionInfoRequest,
  onStepInfoRequest,
}: TaskProgressBarProps) {
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
  const completed = guide.completedStepCount === guide.steps.length;
  const hint = guide.activeStep
    ? completed
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
              <button
                aria-label={step.title}
                className="task-progress-dot"
                data-task-progress-step-id={step.key}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  onStepInfoRequest?.(step.key, {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                  });
                }}
                type="button"
              />
              <span className="task-progress-text">
                <span className="task-progress-title">{step.title}</span>
                <span className="task-progress-description">
                  {step.description}
                </span>
              </span>
            </li>
          ))}
        </ol>

        {hint && completed && guide.completionInfo ? (
          <button
            className="task-progress-hint task-progress-hint-button"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onCompletionInfoRequest?.({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              });
            }}
            type="button"
          >
            {hint}
          </button>
        ) : hint ? (
          <div className="task-progress-hint">
            {hint}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
