import { useState } from 'react';
import { useLabels } from '../../i18n/useLanguage';
import type { KnowledgeLossPoint } from '../knowledgeGraph/model/types';
import './TrainingProcess.css';

type ChartPoint = {
  epoch: number;
  value: number;
  series: 'train' | 'val';
};

type MetricChartLabels = {
  title: string;
  empty: string;
  epoch: string;
  train: string;
  validation: string;
  ariaTrainValidationHistory: string;
  best: string;
};

const WIDTH = 860;
const HEIGHT = 430;
const PADDING = 58;

export function LossHistoryChart({
  history,
}: {
  history: KnowledgeLossPoint[];
}) {
  const labels = useLabels().trainingProcess.lossChart;

  return (
    <MetricHistoryChart
      best="minimum"
      formatTick={formatLossTick}
      formatValue={(value) => value.toFixed(4)}
      history={history}
      labels={labels}
      trainValue={(point) => point.trainLoss}
      validationValue={(point) => point.valLoss}
    />
  );
}

export function AccuracyHistoryChart({
  history,
}: {
  history: KnowledgeLossPoint[];
}) {
  const labels = useLabels().trainingProcess.accuracyChart;
  const hasAccuracy = history.some((point) => (
    isFiniteNumber(point.trainAccuracy)
    || isFiniteNumber(point.valAccuracy)
  ));
  if (!hasAccuracy) return null;

  return (
    <MetricHistoryChart
      best="maximum"
      fixedMaximum={1}
      formatTick={formatAccuracyTick}
      formatValue={(value) => `${(value * 100).toFixed(1)}%`}
      history={history}
      labels={labels}
      trainValue={(point) => point.trainAccuracy}
      validationValue={(point) => point.valAccuracy}
    />
  );
}

function MetricHistoryChart({
  best,
  fixedMaximum,
  formatTick,
  formatValue,
  history,
  labels,
  trainValue,
  validationValue,
}: {
  best: 'minimum' | 'maximum';
  fixedMaximum?: number;
  formatTick: (value: number) => string;
  formatValue: (value: number) => string;
  history: KnowledgeLossPoint[];
  labels: MetricChartLabels;
  trainValue: (point: KnowledgeLossPoint) => number | null | undefined;
  validationValue: (point: KnowledgeLossPoint) => number | null | undefined;
}) {
  const [hovered, setHovered] = useState<ChartPoint | null>(null);
  const train = toChartPoints(history, trainValue, 'train');
  const validation = toChartPoints(history, validationValue, 'val');
  const points = [...train, ...validation];
  const firstEpoch = history[0]?.epoch ?? 0;
  const lastEpoch = history.at(-1)?.epoch ?? firstEpoch;
  const maximum = fixedMaximum ?? niceMaximum(
    Math.max(0, ...points.map((point) => point.value)),
  );
  const x = (epoch: number) => (
    PADDING
    + (lastEpoch === firstEpoch
      ? (WIDTH - PADDING * 2) / 2
      : (epoch - firstEpoch)
        / (lastEpoch - firstEpoch)
        * (WIDTH - PADDING * 2))
  );
  const y = (value: number) => (
    HEIGHT - PADDING
    - Math.max(0, Math.min(maximum, value))
      / maximum
      * (HEIGHT - PADDING * 2)
  );
  const yTicks = Array.from({ length: 6 }, (_, index) => (
    maximum * index / 5
  ));
  const bestValidation = validation.reduce<ChartPoint | null>(
    (currentBest, point) => (
      !currentBest || isBetter(point.value, currentBest.value, best)
        ? point
        : currentBest
    ),
    null,
  );
  const seriesLabel = (series: ChartPoint['series']) => (
    series === 'train' ? labels.train : labels.validation
  );

  return (
    <section className="training-metric-chart">
      <div className="training-metric-chart-header">
        <strong>{labels.title}</strong>
        <span>
          {history.length > 0
            ? `${labels.epoch} ${lastEpoch}`
            : labels.empty}
        </span>
      </div>

      <svg
        aria-label={labels.ariaTrainValidationHistory}
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        {yTicks.map((tick) => (
          <g className="training-chart-tick" key={tick}>
            <line
              x1={PADDING}
              x2={WIDTH - PADDING}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="training-chart-y-label"
              x={PADDING - 10}
              y={y(tick) + 4}
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}
        {epochTicks(firstEpoch, lastEpoch).map((tick) => (
          <g className="training-chart-tick" key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1={HEIGHT - PADDING}
              y2={HEIGHT - PADDING + 5}
            />
            <text x={x(tick)} y={HEIGHT - PADDING + 22}>
              {tick}
            </text>
          </g>
        ))}

        {bestValidation && (
          <g className="training-chart-best">
            <line
              x1={PADDING}
              x2={x(bestValidation.epoch)}
              y1={y(bestValidation.value)}
              y2={y(bestValidation.value)}
            />
            <line
              x1={x(bestValidation.epoch)}
              x2={x(bestValidation.epoch)}
              y1={y(bestValidation.value)}
              y2={HEIGHT - PADDING}
            />
            <text x={PADDING - 10} y={y(bestValidation.value) - 5}>
              {formatValue(bestValidation.value)}
            </text>
            <text
              className="training-chart-best-epoch"
              x={x(bestValidation.epoch)}
              y={HEIGHT - PADDING + 38}
            >
              {labels.best} {bestValidation.epoch}
            </text>
          </g>
        )}

        {train.length > 1 && (
          <path
            className="training-chart-line train"
            d={pathFor(train, x, y)}
            fill="none"
          />
        )}
        {validation.length > 1 && (
          <path
            className="training-chart-line validation"
            d={pathFor(validation, x, y)}
            fill="none"
          />
        )}
        {points.map((point) => (
          <circle
            className="training-chart-hit"
            cx={x(point.epoch)}
            cy={y(point.value)}
            key={`${point.series}-${point.epoch}`}
            onMouseEnter={() => setHovered(point)}
            onMouseLeave={() => setHovered(null)}
            r="8"
          />
        ))}
        {hovered && (
          <g className={`training-chart-hover ${hovered.series}`}>
            <line
              x1={x(hovered.epoch)}
              x2={x(hovered.epoch)}
              y1={PADDING}
              y2={HEIGHT - PADDING}
            />
            <circle cx={x(hovered.epoch)} cy={y(hovered.value)} r="4" />
          </g>
        )}
        {validation.map((point) => (
          <path
            className="training-chart-val-marker"
            d={trianglePath(x(point.epoch), y(point.value), 4)}
            key={`marker-${point.epoch}`}
          />
        ))}
      </svg>

      {hovered && (
        <div
          className="training-chart-tooltip"
          style={{
            left: `${x(hovered.epoch) / WIDTH * 100}%`,
            top: `${y(hovered.value) / HEIGHT * 100}%`,
          }}
        >
          <strong>{seriesLabel(hovered.series)}</strong>
          <span>{labels.epoch} {hovered.epoch}</span>
          <span>{formatValue(hovered.value)}</span>
        </div>
      )}

      <div className="training-metric-chart-legend">
        <span className="train">{labels.train}</span>
        <span className="validation">{labels.validation}</span>
      </div>
    </section>
  );
}

function toChartPoints(
  history: KnowledgeLossPoint[],
  valueOf: (point: KnowledgeLossPoint) => number | null | undefined,
  series: ChartPoint['series'],
) {
  return history.flatMap((point): ChartPoint[] => {
    const value = valueOf(point);
    return isFiniteNumber(value)
      ? [{ epoch: point.epoch, value, series }]
      : [];
  });
}

function isBetter(
  value: number,
  currentBest: number,
  direction: 'minimum' | 'maximum',
) {
  return direction === 'minimum'
    ? value < currentBest
    : value > currentBest;
}

function pathFor(
  points: ChartPoint[],
  x: (epoch: number) => number,
  y: (value: number) => number,
) {
  return points.map((point, index) => (
    `${index === 0 ? 'M' : 'L'} ${x(point.epoch).toFixed(2)} ${
      y(point.value).toFixed(2)
    }`
  )).join(' ');
}

function epochTicks(first: number, last: number) {
  if (first === last) return [first];
  return [...new Set(
    Array.from({ length: 6 }, (_, index) => (
      Math.round(first + (last - first) * index / 5)
    )),
  )];
}

function niceMaximum(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude * 2) / 2 * magnitude;
}

function formatLossTick(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(2);
}

function formatAccuracyTick(value: number) {
  return `${Math.round(value * 100)}%`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function trianglePath(x: number, y: number, radius: number) {
  return [
    `M ${x} ${y - radius}`,
    `L ${x + radius} ${y + radius}`,
    `L ${x - radius} ${y + radius}`,
    'Z',
  ].join(' ');
}
