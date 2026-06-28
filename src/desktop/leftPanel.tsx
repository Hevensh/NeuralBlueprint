import type { DragEvent } from 'react';
import type { DesktopFileType } from './desktopTypes';
import { getFileIcon } from './fileIcons';

export const DESKTOP_FILE_DRAG_TYPE = 'application/neural-blueprint-desktop-file';

interface DesktopFileModule {
  type: DesktopFileType;
  title: string;
  description: string;
}

const desktopFileModules: DesktopFileModule[] = [
  {
    type: 'nbp',
    title: 'Blueprint',
    description: 'Create a neural blueprint file',
  },
  {
    type: 'rep',
    title: 'Report',
    description: 'Create an experiment report file',
  },
];

function handleDragStart(
  event: DragEvent<HTMLDivElement>,
  type: DesktopFileType,
) {
  event.dataTransfer.setData(DESKTOP_FILE_DRAG_TYPE, type);
  event.dataTransfer.effectAllowed = 'copy';
}

interface DesktopLeftPanelProp {
  onResetPositions: () => void;
}

export function DesktopLeftPanel({ onResetPositions }: DesktopLeftPanelProp) {
  return (
    <aside className="left-panel">
      <div className="panel-section-spacer" />
      <button className="action-button" onClick={onResetPositions}>
        Center View
      </button>
      <div className="panel-section-spacer" />
      <div className="title">Available Files</div>
      <div className="module-list">
        {desktopFileModules.map((module) => (
          <div
            className="module-card"
            draggable
            key={module.type}
            onDragStart={(event) => handleDragStart(event, module.type)}
          >
            <div className="module-card-icon">{getFileIcon(module.type, 44)}</div>
            <div className="module-card-copy">
              <div className="module-card-title">{module.title}</div>
              <div className="module-card-description">{module.description}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
