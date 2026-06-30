export function renderTask2NonlinearLinearFitDiagram() {
  return (
    <div
      aria-label="Linear fit on nonlinear data"
      className="task-guide-info-diagram nonlinear-linear-fit"
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
          className="diagram-fit-line"
          d="M72 123 L266 123"
        />
        {[
          [78, 151],
          [102, 111],
          [128, 82],
          [154, 68],
          [181, 72],
          [207, 88],
          [233, 119],
          [258, 153],
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
        <text className="diagram-label warning" x="190" y="144">linear fit</text>
      </svg>
    </div>
  );
}
