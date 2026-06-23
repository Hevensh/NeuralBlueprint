import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { useState } from 'react';
import { knowledgePreviewColor } from './knowledgePreviewColor';
import type { KnowledgeGraphEdgeType } from './KnowledgeGraphNodeTypes';
import { TrainingSignalPreview } from './TrainingSignalPreview';

export function KnowledgeGraphEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  markerEnd,
  selected,
  style,
}: EdgeProps<KnowledgeGraphEdgeType>) {
  const [previewHovered, setPreviewHovered] = useState(false);
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const showPreview = data?.showMemoryPreview || data?.showMetricPreview;
  const hovered = data?.hovered || previewHovered;

  return (
    <>
      <BaseEdge
        id={id}
        className={[
          'knowledge-edge-path',
          data?.kind,
          hovered ? 'preview-hovered' : '',
        ].filter(Boolean).join(' ')}
        markerEnd={markerEnd}
        path={path}
        style={style}
      />
      {data && showPreview && (
        <EdgeLabelRenderer>
          <div
            className={[
              'knowledge-edge-preview',
              data.kind,
              selected ? 'selected' : '',
              hovered ? 'hovered' : '',
              'nodrag',
              'nopan',
            ].filter(Boolean).join(' ')}
            onMouseEnter={() => setPreviewHovered(true)}
            onMouseLeave={() => setPreviewHovered(false)}
            style={{
              color: knowledgePreviewColor(
                data.metrics.mastery,
                data.metrics.overfitPercent,
              ),
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {data.showMemoryPreview && (
              <span>
                {format(data.metrics.allocatedMemory)}
                {' / '}
                {format(data.properties.requiredMemory)}
              </span>
            )}
            {data.showMetricPreview && (
              <>
                <span>M {(data.metrics.mastery * 100).toFixed(2)}%</span>
                <span>O {data.metrics.overfitPercent.toFixed(2)}%</span>
                <TrainingSignalPreview
                  className="knowledge-training-line"
                  stages={data.metrics.stagePreviews}
                />
              </>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function format(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
