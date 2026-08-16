import type { DragEvent } from 'react';
import type { DesktopFileType } from './desktopTypes';
import { getFileIcon } from './fileIcons';
import {
  getDesktopFileTypeLabels,
} from '../i18n/labels';
import { useLanguage } from '../i18n/useLanguage';

export const DESKTOP_FILE_DRAG_TYPE = 'application/neural-blueprint-desktop-file';

interface DesktopFileModule {
  type: DesktopFileType;
}

const desktopFileModules: DesktopFileModule[] = [
  { type: 'nbp' },
  { type: 'rep' },
];

function handleDragStart(
  event: DragEvent<HTMLDivElement>,
  type: DesktopFileType,
) {
  event.dataTransfer.setData(DESKTOP_FILE_DRAG_TYPE, type);
  event.dataTransfer.effectAllowed = 'copy';
}

interface DesktopLeftPanelProp {
  onOpenSettings: () => void;
  onResetPositions: () => void;
}

export function DesktopLeftPanel({
  onOpenSettings,
  onResetPositions,
}: DesktopLeftPanelProp) {
  const { labels, language } = useLanguage();
  const leftPanelLabels = labels.desktop.leftPanel;

  return (
    <aside className="left-panel">
      <div className="panel-section-spacer" />
      <button className="action-button" onClick={onOpenSettings} type="button">
        {leftPanelLabels.settings}
      </button>
      <div className="panel-section-spacer" />
      <button className="action-button" onClick={onResetPositions} type="button">
        {leftPanelLabels.centerView}
      </button>
      <div className="panel-section-spacer" />
      <div className="title">{leftPanelLabels.availableFiles}</div>
      <div className="module-list">
        {desktopFileModules.map((module) => {
          const fileLabels = getDesktopFileTypeLabels(language, module.type);

          return (
            <div
              className="module-card"
              draggable
              key={module.type}
              onDragStart={(event) => handleDragStart(event, module.type)}
            >
              <div className="module-card-icon">{getFileIcon(module.type, 44)}</div>
              <div className="module-card-copy">
                <div className="module-card-title">{fileLabels.title}</div>
                <div className="module-card-description">
                  {fileLabels.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
