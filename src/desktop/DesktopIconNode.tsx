import type { NodeProps } from '@xyflow/react';
import type { DesktopFileType, DesktopIconNodeType } from './desktopTypes';

export function NeuralBlueprintIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* terminal window */}
      <rect x="6" y="8" width="52" height="48" rx="10" fill="#0f172a" />

      {/* top bar */}
      <rect x="6" y="8" width="52" height="12" rx="6" fill="#1e293b" />
      <circle cx="14" cy="15" r="2" fill="#fb7185" />
      <circle cx="21" cy="15" r="2" fill="#facc15" />
      <circle cx="28" cy="15" r="2" fill="#4ade80" />

      <rect x="6" y="8" width="52" height="48" rx="10" stroke="#22d3ee" strokeWidth="2" />

      {/* neural blueprint nodes */}
      <circle cx="42" cy="30" r="3.5" fill="#22d3ee" />
      <circle cx="50" cy="38" r="3.5" fill="#a5f3fc" />
      <circle cx="40" cy="46" r="3.5" fill="#38bdf8" />

      {/* neural connections */}
      <path d="M44.5 32.5L47.5 35.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <path d="M47 39.8L43 44.2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <path d="M41.5 33.5L40.5 42.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TextFileIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* file body */}
      <path
        d="M14 8H39L52 21V54C52 56.2 50.2 58 48 58H14C11.8 58 10 56.2 10 54V12C10 9.8 11.8 8 14 8Z"
        fill="#0f172a"
      />

      {/* folded corner background */}
      <path
        d="M39 8V18C39 20.2 40.8 22 43 22H52L39 8Z"
        fill="#1e293b"
      />

      {/* file outline */}
      <path
        d="M14 8H39L52 21V54C52 56.2 50.2 58 48 58H14C11.8 58 10 56.2 10 54V12C10 9.8 11.8 8 14 8Z"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* fold line */}
      <path
        d="M39 8V18C39 20.2 40.8 22 43 22H52"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* TXT label */}
      <rect x="17" y="17" width="16" height="8" rx="2" fill="#1e293b" />
      <text
        x="27"
        y="24"
        textAnchor="middle"
        fontSize="6"
        fontWeight="700"
        fill="#a5f3fc"
        fontFamily="Nunito Sans'"
      >
        Report
      </text>

      {/* text lines */}
      <path d="M18 33H43" stroke="#a5f3fc" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 40H46" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 47H35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

      {/* small cursor / document mark */}
      <path d="M42 47H46" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function getFileIcon(type: DesktopFileType, size?: number) {
  if (type === 'nbp') return <NeuralBlueprintIcon size={size} />;
  if (type === 'rep') return <TextFileIcon size={size} />;
  return '📦';
}

export function DesktopIconNode({ data, selected }: NodeProps<DesktopIconNodeType>) {
  const { file } = data;

  return (
    <div
      className={`desktop-icon-node ${selected ? 'selected' : ''}`}
    >
      <div className="desktop-icon-symbol">
        {getFileIcon(file.type)}
      </div>
      <div className="desktop-icon-name">
        {file.name}
      </div>
    </div>
  );
}
