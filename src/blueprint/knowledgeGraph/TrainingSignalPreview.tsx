import { formatTrainingSignal } from './formatTrainingSignal';
import type { KnowledgeStagePreview } from './KnowledgeGraphNodeTypes';

export function TrainingSignalPreview({
  stages,
  className,
}: {
  stages: KnowledgeStagePreview[];
  className: string;
}) {
  return (
    <span className={className}>
      {stages.map(({ utility, allocated, required }, stage) => (
        <span className="knowledge-stage-utility" key={stage}>
          U<sub>{stage}</sub> {formatTrainingSignal(utility)}
          {' '}
          {formatMemory(allocated)}/{formatMemory(required)}
        </span>
      ))}
    </span>
  );
}

function formatMemory(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
