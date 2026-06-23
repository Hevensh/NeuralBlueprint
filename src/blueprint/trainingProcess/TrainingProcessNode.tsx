import type { NodeProps } from '@xyflow/react';
import type { TrainingProcessNodeType } from './TrainingProcessNodeTypes';

export function TrainingProcessNode({ data }: NodeProps<TrainingProcessNodeType>) {
  return (
    <div className="training-process-node">
      {data.name}
    </div>
  );
}
