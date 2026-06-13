import { Handle, Position, type NodeProps } from '@xyflow/react';
import './NeuralBlueprintNode.css';
import type { ModuleBaseNode } from './ModuleBaseNodeTypes';

interface NeuralBlueprintNodeProps extends NodeProps<ModuleBaseNode> {
  showRankAnalysis?: boolean;
  showVarianceAnalysis?: boolean;
}

export function NeuralBlueprintNode({
  data,
  showRankAnalysis = false,
  showVarianceAnalysis = false,
}: NeuralBlueprintNodeProps) {
  const outputDim = data.kind === 'Sum' && data.stats?.dimLabel
    ? data.stats.dimLabel
    : formatInteger(data.stats?.rank);
  const effectiveRank = formatFixed(data.stats?.effectiveRank, 2);
  const saturation = formatFixed(data.stats?.saturation, 3);
  const mean = formatFixed(data.stats?.mean, 3);
  const standardDeviation = formatStandardDeviation(data.stats?.variance);

  return (
    <div className={`neural-blueprint-node ${data.kind}`}>
      <Handle
        className="module-base-node-handle input-handle"
        position={Position.Left}
        type="target"
      />
      <div className="neural-blueprint-node-kind">{data.kind}</div>
      <div className="neural-blueprint-node-name">{data.name}</div>
      <div className="neural-blueprint-node-preview">
        <NodePreviewItem label="dim" value={outputDim} />
        {showRankAnalysis && (
          <>
            <NodePreviewItem label="rank" value={effectiveRank} />
            <NodePreviewItem label="sat" value={saturation} />
          </>
        )}
        {showVarianceAnalysis && (
          <>
            <NodePreviewItem label="mean" value={mean} />
            <NodePreviewItem label="std" value={standardDeviation} />
          </>
        )}
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
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="neural-blueprint-node-preview-item">
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
