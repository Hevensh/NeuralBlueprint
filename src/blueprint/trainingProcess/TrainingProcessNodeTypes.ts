import type { Node } from '@xyflow/react';
import type { TrainingProcessPageType } from '../PageTypes';

export interface TrainingProcessNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  type: TrainingProcessPageType;
  position: {
    x: number;
    y: number;
  };
}

export type TrainingProcessNodeType = Node<TrainingProcessNodeData>;
