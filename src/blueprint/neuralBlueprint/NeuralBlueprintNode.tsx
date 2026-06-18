import { Handle, Position, type NodeProps } from '@xyflow/react';
import './NeuralBlueprintNode.css';
import type { ModuleBaseNode } from './ModuleBaseNodeTypes';

export function NeuralBlueprintNode({
  data,
}: NodeProps<ModuleBaseNode>) {
  const outputDim = data.kind === 'Sum' && data.stats?.dimLabel
    ? data.stats.dimLabel
    : formatInteger(data.stats?.rank);
  const effectiveRank = formatFixed(data.stats?.effectiveRank, 2);
  const saturation = formatFixed(data.stats?.saturation, 3);
  const mean = formatFixed(data.stats?.mean, 3);
  const standardDeviation = formatStandardDeviation(data.stats?.variance);
  const className = [
    'neural-blueprint-node',
    data.kind,
    data.inCycle ? 'in-cycle' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <Handle
        className="module-base-node-handle input-handle"
        position={Position.Left}
        type="target"
      />
      <div className="neural-blueprint-node-kind">{data.kind}</div>
      <div className="neural-blueprint-node-name">{data.name}</div>
      <div className="neural-blueprint-node-preview">
        <NodePreviewItem label="dim" value={outputDim} />
        <NodePreviewItem className="rank-analysis-preview" label="rank" value={effectiveRank} />
        <NodePreviewItem className="rank-analysis-preview" label="sat" value={saturation} />
        <NodePreviewItem className="variance-analysis-preview" label="mean" value={mean} />
        <NodePreviewItem className="variance-analysis-preview" label="std" value={standardDeviation} />
      </div>
      <Handle
        className="module-base-node-handle output-handle"
        position={Position.Right}
        type="source"
      />
    </div>
  );
}

function NodePreviewItem({
  className = '',
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={`neural-blueprint-node-preview-item ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatInteger(value: number | undefined) {
  return Number.isFinite(value) ? String(Math.round(value as number)) : '---';
}

function formatFixed(value: number | undefined, digits: number) {
  return Number.isFinite(value) ? (value as number).toFixed(digits) : '---';
}

function formatStandardDeviation(variance: number | undefined) {
  if (!Number.isFinite(variance)) {
    return '---';
  }

  return Math.sqrt(Math.max(variance as number, 0)).toFixed(3);
}
