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
          <span className="knowledge-stage-utility-signal">
            U<sub>{stage}</sub> {formatTrainingSignal(utility)}
          </span>
          <span className="knowledge-stage-memory-left">
            {formatMemory(allocated)}
          </span>
          <span className="knowledge-stage-memory-slash">/</span>
          <span className="knowledge-stage-memory-right">
            {formatMemory(required)}
          </span>
        </span>
      ))}
    </span>
  );
}

function formatMemory(value: number) {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) >= 1000) {
    return value.toExponential(1).replace('e+', 'e');
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
