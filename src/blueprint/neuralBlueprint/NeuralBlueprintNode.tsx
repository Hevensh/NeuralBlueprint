import { Handle, Position, type NodeProps } from '@xyflow/react';
import './NeuralBlueprintNode.css';
import type { ModuleBaseNode } from './ModuleBaseNodeTypes';

export function NeuralBlueprintNode({ data }: NodeProps<ModuleBaseNode>) {
  return (
    <div className={`neural-blueprint-node ${data.kind}`}>
      <Handle
        className="module-base-node-handle input-handle"
        position={Position.Left}
        type="target"
      />
      <div className="neural-blueprint-node-kind">{data.kind}</div>
      <div className="neural-blueprint-node-name">{data.name}</div>
      <Handle
        className="module-base-node-handle output-handle"
        position={Position.Right}
        type="source"
      />
    </div>
  );
}
