import type { CSSProperties } from 'react';
import type {
  InferenceMemoryProfile,
  InferenceMemoryStageSegment,
} from './analysis/inferenceMemoryProfile';
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
  profile: InferenceMemoryProfile;
}

export function InferenceMemoryChart({
  profile,
}: InferenceMemoryChartProps) {
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

  return (
    <section className="inference-memory-section">
      <header className="inference-memory-header">
        <span>Inference Memory</span>
        <strong>{formatMemoryPoint(profile.totalMemoryPoint)}</strong>
      </header>

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
                          key={segment.groupId}
                          segment={segment}
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

          <div className="inference-memory-axis-label">Inference Stage</div>
          <div className="inference-memory-legend">
            {profile.groups.map((group) => (
              <div className="inference-memory-legend-item" key={group.id}>
                <span
                  className="inference-memory-swatch"
                  style={{
                    '--inference-memory-color': colorByGroupId.get(group.id),
                  } as CSSProperties}
                />
                <span>{formatStages(group.inferenceStages)}</span>
                <strong>{formatMemoryPoint(group.memoryPoint)}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="inference-memory-empty">No inference memory data</div>
      )}
    </section>
  );
}

function InferenceMemorySegment({
  color,
  segment,
  stageMemoryPoint,
}: {
  color: string;
  segment: InferenceMemoryStageSegment;
  stageMemoryPoint: number;
}) {
  const height = stageMemoryPoint > 0
    ? (segment.memoryPoint / stageMemoryPoint) * 100
    : 0;

  return (
    <div
      className="inference-memory-segment"
      style={{
        '--inference-memory-color': color,
        height: `${height}%`,
      } as CSSProperties}
      title={`[${segment.groupId}] ${formatMemoryPoint(segment.memoryPoint)}`}
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
