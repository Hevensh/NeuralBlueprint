import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from 'react';
import type {
  InferenceMemoryAggregationPair,
  InferenceMemoryProfile,
  InferenceMemoryStageSegment,
} from './analysis/inferenceMemoryProfile';
import {
  SPATIAL_AXES,
  SPATIAL_BANDS,
  type SpatialAdaptationCapability,
  type SpatialAxis,
  type SpatialAdaptationRoute,
} from '../SpatialAdaptationTypes';
import { PropertyDropdown } from '../../PropertyDropdown';
import { useLabels } from '../../i18n/useLanguage';
import { formatInferenceMemoryPoint } from './inferenceMemoryFormat';
import './InferenceMemoryChart.css';

const GROUP_COLORS = [
  '#38bdf8',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#2dd4bf',
  '#7dd3fc',
];

interface InferenceMemoryChartProps {
  modelOptions?: Array<{
    id: string;
    label: string;
  }>;
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  onActiveGroupFocusChange?: (
    focus: {
      nodeIds: string[];
      aggregationPairs: InferenceMemoryAggregationPair[];
    } | null
  ) => void;
  profile: InferenceMemoryProfile;
  showIndex?: boolean;
  showMemory?: boolean;
  showScale?: boolean;
  spatialAxes?: SpatialAxis[];
}

export function InferenceMemoryChart({
  modelOptions = [],
  selectedModelId = '',
  onModelChange,
  onActiveGroupFocusChange,
  profile,
  showIndex = true,
  showMemory = true,
  showScale = true,
  spatialAxes = [...SPATIAL_AXES],
}: InferenceMemoryChartProps) {
  const labels = useLabels().neuralBlueprint.inferenceMemory;
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const activeGroupId = selectedGroupId
    && profile.groups.some((group) => group.id === selectedGroupId)
    ? selectedGroupId
    : null;
  const colorByGroupId = new Map(
    profile.groups.map((group, index) => [
      group.id,
      GROUP_COLORS[index % GROUP_COLORS.length],
    ]),
  );
  const maxStageMemoryPoint = Math.max(
    ...profile.stages.map((stage) => stage.memoryPoint),
    0,
  );
  const toggleSelectedGroup = useCallback((groupId: string) => {
    setSelectedGroupId((current) => (current === groupId ? null : groupId));
  }, []);

  useEffect(() => {
    const group = activeGroupId
      ? profile.groups.find((item) => item.id === activeGroupId)
      : undefined;

    onActiveGroupFocusChange?.(
      group
        ? {
          nodeIds: group.nodeIds,
          aggregationPairs: group.aggregationPairs,
        }
        : null,
    );
  }, [activeGroupId, onActiveGroupFocusChange, profile.groups]);

  useEffect(() => () => {
    onActiveGroupFocusChange?.(null);
  }, [onActiveGroupFocusChange]);

  return (
    <section className="inference-memory-section">
      <header className="inference-memory-header">
        <span>{labels.title}</span>
        {showMemory && <strong>
          {labels.memory} {formatInferenceMemoryPoint(profile.totalMemoryPoint)}
        </strong>}
      </header>

      {(showScale || showIndex) && spatialAxes.length > 0 && (
        <div className="inference-adaptation-summary">
        <SpatialCapabilityRows
          axes={spatialAxes}
          capability={profile.totalAdaptationCapability}
          indexLabel={labels.index}
          scaleLabel={labels.scale}
          showIndex={showIndex}
          showScale={showScale}
        />
        </div>
      )}

      {modelOptions.length > 1 && (
        <div className="property-panel">
          <label className="property-field">
            <span className="property-label">{labels.model}</span>
            <PropertyDropdown
              onChange={(value) => onModelChange?.(value)}
              options={modelOptions.map((model) => ({
                label: model.label,
                value: model.id,
              }))}
              value={selectedModelId}
            />
          </label>
        </div>
      )}

      {showMemory && profile.stages.length > 0 ? (
        <>
          <div className="inference-memory-chart">
            {profile.stages.map((stage) => {
              const barHeight = maxStageMemoryPoint > 0
                ? (stage.memoryPoint / maxStageMemoryPoint) * 100
                : 0;

              return (
                <div className="inference-memory-stage" key={stage.stage}>
                  <span className="inference-memory-stage-value">
                    {formatInferenceMemoryPoint(stage.memoryPoint)}
                  </span>
                  <div className="inference-memory-bar-track">
                    <div
                      className="inference-memory-bar"
                      style={{ height: `${barHeight}%` }}
                    >
                      {stage.segments.map((segment) => (
                        <InferenceMemorySegment
                          color={colorByGroupId.get(segment.groupId) ?? GROUP_COLORS[0]}
                          dimmed={Boolean(activeGroupId && activeGroupId !== segment.groupId)}
                          key={segment.groupId}
                          onClick={() => toggleSelectedGroup(segment.groupId)}
                          segment={segment}
                          selected={selectedGroupId === segment.groupId}
                          stageMemoryPoint={stage.memoryPoint}
                        />
                      ))}
                    </div>
                  </div>
                  <strong className="inference-memory-stage-label">
                    {stage.stage}
                  </strong>
                </div>
              );
            })}
          </div>

          <div className="inference-memory-axis-label">{labels.axis}</div>
        </>
      ) : showMemory && (
        <div className="inference-memory-empty">{labels.empty}</div>
      )}

      {profile.groups.length > 0 && (
        <div className="inference-memory-legend">
          {profile.groups.map((group) => (
            <button
              className={[
                'inference-memory-legend-item',
                activeGroupId === group.id ? 'active' : '',
                selectedGroupId === group.id ? 'selected' : '',
                activeGroupId && activeGroupId !== group.id ? 'dimmed' : '',
              ].filter(Boolean).join(' ')}
              key={group.id}
              onClick={() => toggleSelectedGroup(group.id)}
              type="button"
            >
              <span
                className="inference-memory-swatch"
                style={{
                  '--inference-memory-color': colorByGroupId.get(group.id),
                } as CSSProperties}
              />
              <span className="inference-memory-legend-stages">
                {formatStages(group.inferenceStages)}
              </span>
              {showMemory && <strong>
                {labels.memory} {formatInferenceMemoryPoint(group.memoryPoint)}
              </strong>}
              {(showScale || showIndex) && spatialAxes.length > 0 && (
                <div className="inference-memory-legend-resources">
                  <SpatialCapabilityRows
                    axes={spatialAxes}
                    capability={group.adaptationCapability}
                    indexLabel={labels.index}
                    scaleLabel={labels.scale}
                    showIndex={showIndex}
                    showScale={showScale}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {!showMemory && profile.groups.length === 0 && (
        <div className="inference-memory-empty">{labels.empty}</div>
      )}
    </section>
  );
}

function AdaptationPointRow({
  label,
  points,
}: {
  label: string;
  points: Array<[string, number]>;
}) {
  return (
    <div className="inference-adaptation-row">
      <span className="inference-adaptation-label">{label}</span>
      <span className="inference-adaptation-points">
        {points.map(([band, value]) => (
          <span className="inference-adaptation-point" key={band}>
            <small>{band}</small>
            {formatInferenceMemoryPoint(value)}
          </span>
        ))}
      </span>
    </div>
  );
}

function SpatialCapabilityRows({
  axes,
  capability,
  indexLabel,
  scaleLabel,
  showIndex,
  showScale,
}: {
  axes: SpatialAxis[];
  capability: SpatialAdaptationCapability;
  indexLabel: string;
  scaleLabel: string;
  showIndex: boolean;
  showScale: boolean;
}) {
  const routes: SpatialAdaptationRoute[] = [
    ...(showScale ? ['scale' as const] : []),
    ...(showIndex ? ['index' as const] : []),
  ];

  return axes.flatMap((axis) => (
    routes.map((route) => (
      <AdaptationPointRow
        key={`${axis}-${route}`}
        label={`${axisLabel(axis)} ${route === 'scale' ? scaleLabel : indexLabel}`}
        points={spatialPointEntries(capability, axis, route)}
      />
    ))
  ));
}

function spatialPointEntries(
  capability: SpatialAdaptationCapability,
  axis: keyof SpatialAdaptationCapability,
  route: SpatialAdaptationRoute,
): Array<[string, number]> {
  const labels = ['S', 'M', 'L', 'XL', 'G'];
  return SPATIAL_BANDS.map((band, index) => [
    labels[index],
    capability[axis][route][band],
  ]);
}

function axisLabel(axis: keyof SpatialAdaptationCapability) {
  return axis === 'time' ? 'T' : axis === 'height' ? 'H' : 'W';
}

function InferenceMemorySegment({
  color,
  dimmed,
  onClick,
  segment,
  selected,
  stageMemoryPoint,
}: {
  color: string;
  dimmed: boolean;
  onClick: () => void;
  segment: InferenceMemoryStageSegment;
  selected: boolean;
  stageMemoryPoint: number;
}) {
  const height = stageMemoryPoint > 0
    ? (segment.memoryPoint / stageMemoryPoint) * 100
    : 0;

  return (
    <button
      className={[
        'inference-memory-segment',
        selected ? 'selected' : '',
        dimmed ? 'dimmed' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick();
      }}
      style={{
        '--inference-memory-color': color,
        height: `${height}%`,
      } as CSSProperties}
      title={`[${segment.groupId}] ${formatInferenceMemoryPoint(segment.memoryPoint)}`}
      type="button"
    />
  );
}

function formatStages(stages: number[]) {
  return `[${stages.join(', ')}]`;
}
