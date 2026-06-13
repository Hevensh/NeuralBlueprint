import type { CorrelationLine } from './correlationLines';

export function CorrelationOverlay({ lines }: { lines: CorrelationLine[] }) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <svg className="correlation-overlay">
      {lines.map((line) => (
        <g className="correlation-overlay-line-group" key={line.id}>
          <line
            className="correlation-overlay-hit-line"
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            strokeWidth={Math.max(line.strokeWidth * 4, 18)}
          />
          <line
            className="correlation-overlay-line"
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            strokeWidth={line.strokeWidth}
            strokeDasharray={line.strokeDasharray}
          />
          <text
            className="correlation-overlay-label"
            x={line.labelX}
            y={line.labelY - ((line.labels.length - 1) * line.lineGap / 2)}
            fontSize={line.fontSize}
          >
            {line.labels.map((label, index) => (
              <tspan
                key={label}
                x={line.labelX}
                dy={index === 0 ? 0 : line.lineGap}
              >
                {label}
              </tspan>
            ))}
          </text>
        </g>
      ))}
    </svg>
  );
}
