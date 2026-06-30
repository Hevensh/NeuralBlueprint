export function renderTask2NonlinearReluFitDiagram() {
  return (
    <div
      aria-label="ReLU piecewise fit on nonlinear data"
      className="task-guide-info-diagram nonlinear-relu-fit"
      role="img"
    >
      <svg viewBox="0 0 320 220">
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
          d="M58 172 L58 42 M58 172 L270 172"
        />
        <path
          className="diagram-grid"
          d="M58 132 H270 M58 92 H270 M106 172 V42 M154 172 V42 M202 172 V42 M250 172 V42"
        />
        <path
          className="diagram-curve"
          d="M70 158 C112 84 157 56 202 82 C231 99 252 128 266 158"
        />
        <path
          className="diagram-piecewise-line"
          d="M76 151 L106 106 L136 79 L166 68 L196 78 L226 108 L260 154"
        />
        {[
          [78, 151],
          [106, 106],
          [136, 79],
          [166, 68],
          [196, 78],
          [226, 108],
          [260, 154],
        ].map(([cx, cy], index) => (
          <circle
            className="diagram-point"
            cx={cx}
            cy={cy}
            key={`${cx}-${cy}-${index}`}
            r="5"
          />
        ))}
        <text className="diagram-label" x="66" y="38">nonlinear data</text>
        <text className="diagram-label success" x="172" y="58">piecewise fit</text>
      </svg>
    </div>
  );
}
