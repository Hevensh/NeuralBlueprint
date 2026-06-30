import { useState } from 'react';
import { useLabels } from '../../i18n/LanguageContext';
import type { KnowledgeLossPoint } from '../knowledgeGraph/model/types';
import './TrainingProcess.css';

type ChartPoint = {
  epoch: number;
  loss: number;
  series: 'train' | 'val';
};

const WIDTH = 860;
const HEIGHT = 430;
const PADDING = 58;

export function LossHistoryChart({
  history,
}: {
  history: KnowledgeLossPoint[];
}) {
  const chartLabels = useLabels().trainingProcess.lossChart;
  const [hovered, setHovered] = useState<ChartPoint | null>(null);
  const train = history
    .filter((point) => Number.isFinite(point.trainLoss))
    .map((point) => ({
      epoch: point.epoch,
      loss: point.trainLoss,
      series: 'train' as const,
    }));
  const validation = history
    .filter((point): point is KnowledgeLossPoint & { valLoss: number } => (
      typeof point.valLoss === 'number' && Number.isFinite(point.valLoss)
    ))
    .map((point) => ({
      epoch: point.epoch,
      loss: point.valLoss,
      series: 'val' as const,
    }));
  const points = [...train, ...validation];
  const firstEpoch = history[0]?.epoch ?? 0;
  const lastEpoch = history.at(-1)?.epoch ?? firstEpoch;
  const maxLoss = niceMaximum(Math.max(0, ...points.map((point) => point.loss)));
  const x = (epoch: number) => (
    PADDING
    + (lastEpoch === firstEpoch
      ? (WIDTH - PADDING * 2) / 2
      : (epoch - firstEpoch)
        / (lastEpoch - firstEpoch)
        * (WIDTH - PADDING * 2))
  );
  const y = (loss: number) => (
    HEIGHT - PADDING
    - loss / maxLoss * (HEIGHT - PADDING * 2)
  );
  const yTicks = Array.from({ length: 6 }, (_, index) => (
    maxLoss * index / 5
  ));
  const bestVal = validation.reduce<ChartPoint | null>((best, point) => (
    !best || point.loss < best.loss ? point : best
  ), null);
  const seriesLabel = (series: ChartPoint['series']) => (
    series === 'train' ? chartLabels.train : chartLabels.validation
  );

  return (
    <section className="training-loss-chart">
      <div className="training-loss-chart-header">
        <strong>{chartLabels.title}</strong>
        <span>
          {history.length > 0
            ? `${chartLabels.epoch} ${lastEpoch}`
            : chartLabels.empty}
        </span>
      </div>

      <svg
        aria-label={chartLabels.ariaTrainValidationHistory}
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

        {bestVal && (
          <g className="training-chart-best">
            <line
              x1={PADDING}
              x2={x(bestVal.epoch)}
              y1={y(bestVal.loss)}
              y2={y(bestVal.loss)}
            />
            <line
              x1={x(bestVal.epoch)}
              x2={x(bestVal.epoch)}
              y1={y(bestVal.loss)}
              y2={HEIGHT - PADDING}
            />
            <text x={PADDING - 10} y={y(bestVal.loss) - 5}>
              {bestVal.loss.toFixed(3)}
            </text>
            <text
              className="training-chart-best-epoch"
              x={x(bestVal.epoch)}
              y={HEIGHT - PADDING + 38}
            >
              {chartLabels.best} {bestVal.epoch}
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
            cy={y(point.loss)}
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
            <circle cx={x(hovered.epoch)} cy={y(hovered.loss)} r="4" />
          </g>
        )}
        {validation.map((point) => (
          <path
            className="training-chart-val-marker"
            d={trianglePath(x(point.epoch), y(point.loss), 4)}
            key={`marker-${point.epoch}`}
          />
        ))}
      </svg>

      {hovered && (
        <div
          className="training-chart-tooltip"
          style={{
            left: `${x(hovered.epoch) / WIDTH * 100}%`,
            top: `${y(hovered.loss) / HEIGHT * 100}%`,
          }}
        >
          <strong>{seriesLabel(hovered.series)}</strong>
          <span>{chartLabels.epoch} {hovered.epoch}</span>
          <span>{hovered.loss.toFixed(4)}</span>
        </div>
      )}

      <div className="training-loss-chart-legend">
        <span className="train">{chartLabels.train}</span>
        <span className="validation">{chartLabels.validation}</span>
      </div>
    </section>
  );
}

function pathFor(
  points: ChartPoint[],
  x: (epoch: number) => number,
  y: (loss: number) => number,
) {
  return points.map((point, index) => (
    `${index === 0 ? 'M' : 'L'} ${x(point.epoch).toFixed(2)} ${
      y(point.loss).toFixed(2)
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

function formatTick(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(2);
}

function trianglePath(x: number, y: number, radius: number) {
  return [
    `M ${x} ${y - radius}`,
    `L ${x + radius} ${y + radius}`,
    `L ${x - radius} ${y + radius}`,
    'Z',
  ].join(' ');
}
