import { Handle, Position, type NodeProps } from '@xyflow/react';
import './NeuralBlueprintNode.css';
import './NeuralBlueprintNodeBackward.css';
import type { ModuleBaseNode } from './ModuleBaseNodeTypes';

export function NeuralBlueprintNode({
  data,
}: NodeProps<ModuleBaseNode>) {
  const isBackward = data.analysisDirection === 'backward';
  const stats = isBackward ? data.statsBackward : data.stats;
  const outputDim = getOutputDimLabel(data, isBackward, stats?.rank);
  const effectiveRank = formatFixed(stats?.effectiveRank, 2);
  const saturation = formatFixed(stats?.saturation, 3);
  const mean = formatFixed(stats?.mean, 3);
  const standardDeviation = formatStandardDeviation(stats?.variance);
  const className = [
    'neural-blueprint-node',
    data.kind,
    data.inCycle ? 'in-cycle' : '',
    data.inInferenceMemoryFocus ? 'in-inference-memory-focus' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      data-guide-node-id={data.id}
      data-guide-node-kind={data.kind}
      data-guide-predecessor-ids={data.predecessors.map((node) => node.id).join(' ')}
      data-guide-successor-ids={data.successors.map((node) => node.id).join(' ')}
      data-guide-target={`module-node-${data.id}`}
    >
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

function getOutputDimLabel(
  data: ModuleBaseNode['data'],
  isBackward: boolean,
  rank: number | undefined,
) {
  if (isBackward) return formatInteger(rank);

  if (data.kind === 'Output') {
    if (data.stats?.dimLabel === 'not the same') return 'not the same';
    if (data.predecessors.length === 0) {
      return `need ${formatInteger(data.neededOutputDim)}`;
    }
    if (data.stats?.dimLabel !== 'normal') return data.stats?.dimLabel ?? '---';
    return formatInteger(rank);
  }

  return data.stats?.dimLabel !== 'normal'
    ? data.stats?.dimLabel ?? '---'
    : formatInteger(rank);
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
