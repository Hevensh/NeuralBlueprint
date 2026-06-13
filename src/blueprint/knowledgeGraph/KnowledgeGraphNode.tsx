import type { NodeProps } from '@xyflow/react';
import './KnowledgeGraphNode.css';
import type { KnowledgeGraphNodeType } from './KnowledgeGraphNodeTypes';

export function KnowledgeGraphNode({ data }: NodeProps<KnowledgeGraphNodeType>) {
  return (
    <div className="knowledge-graph-node">
      {data.name}
    </div>
  );
}
