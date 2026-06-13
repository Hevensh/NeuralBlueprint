import type { Node } from '@xyflow/react';
import type { KnowledgeGraphPageType } from '../PageTypes';

export interface KnowledgeGraphNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  type: KnowledgeGraphPageType;
  position: {
    x: number;
    y: number;
  };
}

export type KnowledgeGraphNodeType = Node<KnowledgeGraphNodeData>;
