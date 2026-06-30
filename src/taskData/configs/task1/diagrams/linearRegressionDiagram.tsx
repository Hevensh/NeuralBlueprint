export function renderTask1LinearRegressionDiagram() {
  return (
    <div
      aria-label="Linear regression diagram"
      className="task-guide-info-diagram linear-regression"
      role="img"
    >
      <svg viewBox="0 0 320 220">
        <defs>
          <linearGradient id="task-guide-regression-line" x1="0" x2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="task-guide-regression-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          className="diagram-frame"
          height="190"
          rx="18"
          width="284"
          x="18"
          y="15"
        />
        <path
          className="diagram-axis"
          d="M58 172 L58 46 M58 172 L270 172"
        />
        <path
          className="diagram-grid"
          d="M58 132 H270 M58 92 H270 M106 172 V46 M154 172 V46 M202 172 V46 M250 172 V46"
        />
        <path
          className="diagram-line"
          d="M70 150 L266 52"
        />
        {[
          [82, 147],
          [105, 131],
          [126, 126],
          [148, 112],
          [171, 103],
          [190, 87],
          [210, 83],
          [233, 63],
          [252, 58],
        ].map(([cx, cy], index) => (
          <circle
            className="diagram-point"
            cx={cx}
            cy={cy}
            key={`${cx}-${cy}-${index}`}
            r="5"
          />
        ))}
        <text className="diagram-label" x="68" y="38">features</text>
        <text className="diagram-label" x="205" y="190">target</text>
      </svg>
    </div>
  );
}
