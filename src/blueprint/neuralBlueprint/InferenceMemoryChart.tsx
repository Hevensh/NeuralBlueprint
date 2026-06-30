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
import { PropertyDropdown } from '../../PropertyDropdown';
import { useLabels } from '../../i18n/LanguageContext';
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
}

export function InferenceMemoryChart({
  modelOptions = [],
  selectedModelId = '',
  onModelChange,
  onActiveGroupFocusChange,
  profile,
}: InferenceMemoryChartProps) {
  const labels = useLabels().neuralBlueprint.inferenceMemory;
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const activeGroupId = selectedGroupId;
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

  useEffect(() => {
    setSelectedGroupId((current) => (
      current && profile.groups.some((group) => group.id === current)
        ? current
        : null
    ));
  }, [profile.groups]);

  return (
    <section className="inference-memory-section">
      <header className="inference-memory-header">
        <span>{labels.title}</span>
        <strong>{formatMemoryPoint(profile.totalMemoryPoint)}</strong>
      </header>

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

      {profile.stages.length > 0 ? (
        <>
          <div className="inference-memory-chart">
            {profile.stages.map((stage) => {
              const barHeight = maxStageMemoryPoint > 0
                ? (stage.memoryPoint / maxStageMemoryPoint) * 100
                : 0;

              return (
                <div className="inference-memory-stage" key={stage.stage}>
                  <span className="inference-memory-stage-value">
                    {formatMemoryPoint(stage.memoryPoint)}
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
                <span>{formatStages(group.inferenceStages)}</span>
                <strong>{formatMemoryPoint(group.memoryPoint)}</strong>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="inference-memory-empty">{labels.empty}</div>
      )}
    </section>
  );
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
      title={`[${segment.groupId}] ${formatMemoryPoint(segment.memoryPoint)}`}
      type="button"
    />
  );
}

function formatStages(stages: number[]) {
  return `[${stages.join(', ')}]`;
}

function formatMemoryPoint(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? 'compact' : 'standard',
  }).format(value);
}
