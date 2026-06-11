import type { Node } from '@xyflow/react';

export type ModuleType = 'input' | 'loss';

export interface ModuleNode extends Record<string, unknown>{
  id: string;
  name: string;
  type: ModuleType;
  position: {
    x: number;
    y: number;
  };
}

export type ModuleNodeType = Node<ModuleNode>;