import {
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import type { CSSProperties } from 'react';
import { knowledgePreviewColor } from './knowledgePreviewColor';
import type { KnowledgeGraphNodeType } from './KnowledgeGraphNodeTypes';
import { TrainingSignalPreview } from './TrainingSignalPreview';

const HANDLE_POSITIONS = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
];

type NodeStyle = CSSProperties & {
  '--knowledge-node-color': string;
  '--knowledge-dataset-color'?: string;
};

export function KnowledgeGraphNode({
  data,
  selected,
}: NodeProps<KnowledgeGraphNodeType>) {
  const masteryPercent = (data.metrics.mastery * 100).toFixed(2);
  const overfitPercent = data.metrics.overfitPercent.toFixed(2);
  const nodeStyle: NodeStyle = {
    '--knowledge-node-color': data.color,
    ...(data.datasetHighlightColor
      ? { '--knowledge-dataset-color': data.datasetHighlightColor }
      : {}),
  };

  return (
    <div
      aria-selected={selected}
      className={`knowledge-node-shell ${
        data.datasetHighlighted ? 'dataset-highlighted' : ''
      }`}
      style={nodeStyle}
    >
      {HANDLE_POSITIONS.map((position) => (
        <Handle
          className="knowledge-node-handle"
          id={`target-${position}`}
          key={`target-${position}`}
          position={position}
          type="target"
        />
      ))}
      <div className="knowledge-node-core">
        <span className="knowledge-node-name">{data.name}</span>
      </div>

      {(data.showMemoryPreview || data.showMetricPreview) &&
        <div
          className="knowledge-node-preview"
          style={{
            color: knowledgePreviewColor(
              data.metrics.mastery,
              data.metrics.overfitPercent,
            ),
          }}
        >
          {data.showMemoryPreview && (
            <span className="knowledge-node-preview-line">
              {formatMemory(data.metrics.allocatedMemory)}
              {' / '}
              {formatMemory(data.properties.requiredMemory)}
            </span>
          )}
          {data.showMetricPreview && (
            <>
              <span className="knowledge-node-preview-line">
                M {masteryPercent}%
              </span>
              <span className="knowledge-node-preview-line">
                O {overfitPercent}%
              </span>
              <TrainingSignalPreview
                className="knowledge-node-preview-line knowledge-training-line"
                stages={data.metrics.stagePreviews}
              />
            </>
          )}
        </div>}
      {HANDLE_POSITIONS.map((position) => (
        <Handle
          className="knowledge-node-handle"
          id={`source-${position}`}
          key={`source-${position}`}
          position={position}
          type="source"
        />
      ))}
    </div>
  );
}

function formatMemory(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
