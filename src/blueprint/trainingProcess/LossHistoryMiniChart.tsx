import './TrainingProcess.css';

export type LossHistoryPoint = {
  epoch: number;
  trainLoss: number;
  valLoss: number | null;
};

interface LossHistoryMiniChartProps {
  history: LossHistoryPoint[];
}

const WIDTH = 224;
const HEIGHT = 92;
const PADDING_X = 8;
const PADDING_Y = 8;

export function LossHistoryMiniChart({
  history,
}: LossHistoryMiniChartProps) {
  const points = history.slice(-41);
  const train = points.filter((point) => Number.isFinite(point.trainLoss));
  const validation = points.filter(
    (point): point is LossHistoryPoint & { valLoss: number } => (
      typeof point.valLoss === 'number' && Number.isFinite(point.valLoss)
    ),
  );
  const values = [
    ...train.map((point) => point.trainLoss),
    ...validation.map((point) => point.valLoss),
  ];
  const firstEpoch = points[0]?.epoch ?? 0;
  const lastEpoch = points.at(-1)?.epoch ?? firstEpoch;
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const valuePadding = Math.max((maxValue - minValue) * 0.08, 0.001);
  const minLoss = Math.max(0, minValue - valuePadding);
  const maxLoss = Math.max(minLoss + 0.001, maxValue + valuePadding);
  const latest = points.at(-1);
  const latestValidation = validation.at(-1);

  const x = (epoch: number) => (
    PADDING_X
    + (lastEpoch === firstEpoch
      ? (WIDTH - PADDING_X * 2) / 2
      : (epoch - firstEpoch)
        / (lastEpoch - firstEpoch)
        * (WIDTH - PADDING_X * 2))
  );
  const y = (loss: number) => (
    HEIGHT - PADDING_Y
    - (loss - minLoss)
      / (maxLoss - minLoss)
      * (HEIGHT - PADDING_Y * 2)
  );

  return (
    <section
      aria-label="Loss history"
      className="training-loss-history nodrag nopan"
    >
      <div className="training-loss-history-header">
        <strong>Loss History</strong>
        <span>{latest ? `Epoch ${latest.epoch}` : 'No training yet'}</span>
      </div>
      <svg
        aria-label="Train and validation loss"
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            className="training-loss-grid"
            key={ratio}
            x1={PADDING_X}
            x2={WIDTH - PADDING_X}
            y1={PADDING_Y + ratio * (HEIGHT - PADDING_Y * 2)}
            y2={PADDING_Y + ratio * (HEIGHT - PADDING_Y * 2)}
          />
        ))}
        {train.length > 1 && (
          <path
            className="training-loss-line train"
            d={pathFor(train, x, (point) => y(point.trainLoss))}
            fill="none"
          />
        )}
        {validation.length > 1 && (
          <path
            className="training-loss-line validation"
            d={pathFor(validation, x, (point) => y(point.valLoss))}
            fill="none"
          />
        )}
        {train.length === 1 && (
          <circle
            className="training-loss-point train"
            cx={x(train[0].epoch)}
            cy={y(train[0].trainLoss)}
            r="2.5"
          />
        )}
        {validation.map((point) => (
          <path
            className="training-chart-val-marker"
            d={trianglePath(x(point.epoch), y(point.valLoss), 2.5)}
            key={`marker-${point.epoch}`}
          />
        ))}
      </svg>
      <div className="training-loss-history-footer">
        <span className="train">
          Train {formatLoss(latest?.trainLoss)}
        </span>
        <span className="validation">
          Val {formatLoss(latestValidation?.valLoss)}
        </span>
      </div>
    </section>
  );
}

function pathFor<T extends { epoch: number }>(
  points: T[],
  x: (epoch: number) => number,
  y: (point: T) => number,
) {
  return points.map((point, index) => (
    `${index === 0 ? 'M' : 'L'} ${x(point.epoch).toFixed(2)} ${
      y(point).toFixed(2)
    }`
  )).join(' ');
}

function trianglePath(x: number, y: number, radius: number) {
  return [
    `M ${x} ${y - radius}`,
    `L ${x + radius} ${y + radius}`,
    `L ${x - radius} ${y + radius}`,
    'Z',
  ].join(' ');
}

function formatLoss(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(3)
    : '—';
}
