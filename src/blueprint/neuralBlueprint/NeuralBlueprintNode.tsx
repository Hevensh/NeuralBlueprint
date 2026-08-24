import { Handle, Position, type NodeProps } from '@xyflow/react';
import './NeuralBlueprintNode.css';
import './NeuralBlueprintNodeBackward.css';
import type {
  ModuleBaseNode,
  ModuleDimension,
  ModuleTensorShape,
  SpatialViewStats,
} from './ModuleBaseNodeTypes';

export function NeuralBlueprintNode({
  data,
}: NodeProps<ModuleBaseNode>) {
  const isBackward = data.analysisDirection === 'backward';
  const stats = isBackward ? data.statsBackward : data.stats;
  const hasNoInputConnection = requiresInputConnection(data)
    && data.links.predecessorIds.length === 0;
  const needsSpatialInput = shouldShowSpatialInputRequirement(data, isBackward);
  const outputDim = getOutputDimLabel(
    data,
    isBackward,
    stats?.rank.outputRank,
    needsSpatialInput,
  );
  const effectiveRank = formatFixed(stats?.rank.effectiveRank, 2);
  const saturation = formatFixed(stats?.rank.saturation, 3);
  const mean = formatFixed(stats?.distribution.mean, 3);
  const standardDeviation = formatStandardDeviation(
    stats?.distribution.variance,
  );
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
      data-guide-predecessor-ids={data.links.predecessorIds.join(' ')}
      data-guide-successor-ids={data.links.successorIds.join(' ')}
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
        <ShapePreview
          alwaysShowSpatial={data.kind === 'CNN' || data.kind === 'ResNetStage' || data.kind === 'Resize' || data.kind === 'Pooling'}
          fallback={outputDim}
          preferFallback={!isBackward && data.stats?.status !== 'valid'}
          shape={data.stats?.shape}
          unavailableDimensions={!isBackward && hasNoInputConnection}
          convolution={data.kind === 'CNN'
            ? { kernelSize: data.kernelSize, stride: data.stride }
            : undefined}
        />
        <NodePreviewItem className="rank-analysis-preview" label="rank" value={effectiveRank} />
        <NodePreviewItem className="rank-analysis-preview" label="sat" value={saturation} />
        <NodePreviewItem className="variance-analysis-preview" label="mean" value={mean} />
        <NodePreviewItem className="variance-analysis-preview" label="std" value={standardDeviation} />
        <NodePreviewItem className="repetition-analysis-preview" label="RF" value={formatViewReach(data.stats?.spatialView)} />
        <NodePreviewItem className="repetition-analysis-preview" label="view" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.spatialView.viewRank, 0)} />
        <NodePreviewItem className="repetition-analysis-preview" label="sca-S" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.repetition.effective.small, 2)} />
        <NodePreviewItem className="repetition-analysis-preview" label="sca-M" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.repetition.effective.medium, 2)} />
        <NodePreviewItem className="repetition-analysis-preview" label="sca-L" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.repetition.effective.large, 2)} />
        <NodePreviewItem className="repetition-analysis-preview" label="sca-XL" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.repetition.effective.extraLarge, 2)} />
        <NodePreviewItem className="repetition-analysis-preview" label="sca-G" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.repetition.effective.global, 2)} />
        <NodePreviewItem className="distance-index-analysis-preview" label="idx-S" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.distanceIndex.short, 2)} />
        <NodePreviewItem className="distance-index-analysis-preview" label="idx-M" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.distanceIndex.medium, 2)} />
        <NodePreviewItem className="distance-index-analysis-preview" label="idx-L" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.distanceIndex.long, 2)} />
        <NodePreviewItem className="distance-index-analysis-preview" label="idx-XL" value={formatFixed(hasNoInputConnection ? undefined : 0, 2)} />
        <NodePreviewItem className="distance-index-analysis-preview" label="idx-G" value={formatFixed(hasNoInputConnection ? undefined : data.stats?.adaptation.distanceIndex.global, 2)} />
      </div>
      <Handle
        className="module-base-node-handle output-handle"
        position={Position.Right}
        type="source"
      />
    </div>
  );
}

function ShapePreview({
  alwaysShowSpatial = false,
  fallback,
  preferFallback = false,
  shape,
  unavailableDimensions = false,
  convolution,
}: {
  alwaysShowSpatial?: boolean;
  fallback: string;
  preferFallback?: boolean;
  shape: ModuleTensorShape | undefined;
  unavailableDimensions?: boolean;
  convolution?: {
    kernelSize: number;
    stride: number;
  };
}) {
  const dimensions: Array<readonly [string, string]> = [];
  if (shape?.time !== undefined && shape.time !== 'absent') {
    dimensions.push(['T', unavailableDimensions ? '---' : formatDimension(shape.time)]);
  }
  if (preferFallback) {
    dimensions.push(['dim', fallback]);
  } else if (shape?.channels !== undefined && shape.channels !== 'absent') {
    dimensions.push(['dim', formatDimension(shape.channels)]);
  }
  if (alwaysShowSpatial || (shape?.height !== undefined && shape.height !== 'absent')) {
    dimensions.push([
      'H',
      unavailableDimensions ? '---' : formatDimension(shape?.height ?? 'absent'),
    ]);
  }
  if (alwaysShowSpatial || (shape?.width !== undefined && shape.width !== 'absent')) {
    dimensions.push([
      'W',
      unavailableDimensions ? '---' : formatDimension(shape?.width ?? 'absent'),
    ]);
  }
  if (dimensions.length === 0) {
    return (
      <>
        {convolution ? (
          <div className="neural-blueprint-node-convolution-grid">
            <NodePreviewItem label="kernel size" value={String(convolution.kernelSize)} />
            <NodePreviewItem label="stride" value={String(convolution.stride)} />
          </div>
        ) : null}
        <NodePreviewItem label="dim" value={fallback} />
      </>
    );
  }
  const hasLeadingDimension = dimensions.length % 2 === 1;
  return (
    <>
      {convolution ? (
        <div className="neural-blueprint-node-convolution-grid">
          <NodePreviewItem label="kernel size" value={String(convolution.kernelSize)} />
          <NodePreviewItem label="stride" value={String(convolution.stride)} />
        </div>
      ) : null}
      <div className="neural-blueprint-node-shape-grid">
        {dimensions.map(([label, value], index) => (
          <NodePreviewItem
            className={hasLeadingDimension && index === 0 ? 'shape-leading-item' : ''}
            key={label}
            label={label}
            value={value}
          />
        ))}
      </div>
    </>
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

function formatDimension(value: ModuleDimension) {
  if (value === 'unknown') return '?';
  if (value === 'absent') return '—';
  return formatInteger(value);
}

function getOutputDimLabel(
  data: ModuleBaseNode['data'],
  isBackward: boolean,
  rank: number | undefined,
  needsSpatialInput: boolean,
) {
  if (isBackward) return formatInteger(rank);
  if (requiresInputConnection(data) && data.links.predecessorIds.length === 0) {
    return '---';
  }
  if (needsSpatialInput) return 'need H W';

  if (data.kind === 'Output') {
    if (data.stats?.status === 'shape-mismatch') return 'not the same';
    if (data.stats?.status !== 'valid') return '---';
    return formatInteger(rank);
  }

  return data.stats?.status !== 'valid'
    ? data.stats?.status === 'shape-mismatch' ? 'not the same' : '---'
    : formatInteger(rank);
}

function shouldShowSpatialInputRequirement(
  data: ModuleBaseNode['data'],
  isBackward: boolean,
) {
  if (
    isBackward
    || (
      data.kind !== 'CNN'
      && data.kind !== 'ResNetStage'
      && data.kind !== 'Pooling'
      && data.kind !== 'Resize'
      && data.kind !== 'PatchEmbedding'
    )
  ) {
    return false;
  }

  if (data.links.predecessorIds.length === 0) {
    return false;
  }

  if (data.stats?.status !== 'shape-mismatch') {
    return false;
  }

  const inputShape = data.predecessors[0]?.stats?.shape;
  return !inputShape
    || inputShape.height === 'absent'
    || inputShape.width === 'absent';
}

function formatViewReach(view: SpatialViewStats | undefined) {
  if (!view) return '---';
  const values = [view.axes.time, view.axes.height, view.axes.width]
    .filter((axis) => axis.positions !== 'absent')
    .map((axis) => formatDimension(axis.reach));
  return values.length > 0 ? values.join('×') : '---';
}

function requiresInputConnection(data: ModuleBaseNode['data']) {
  return data.kind !== 'Input' && data.kind !== '3DInput';
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
