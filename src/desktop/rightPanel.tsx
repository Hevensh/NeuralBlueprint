import type { ChangeEvent } from 'react';
import type { DesktopFile } from './desktopTypes';
import { useLanguage } from '../i18n/LanguageContext';
import { getDesktopFileTypeLabels } from '../i18n/labels';
import { getDesktopFileDisplayName } from './desktopFileNames';

interface DesktopRightPanelProp {
  selectedFile: DesktopFile | null;
  onRenameFile: (fileId: string, name: string) => void;
  onDeleteFile: (fileId: string) => void;
  onResetFile: (file: DesktopFile) => void;
}

export function DesktopRightPanel({
  selectedFile,
  onRenameFile,
  onDeleteFile,
  onResetFile,
}: DesktopRightPanelProp) {
  const { language, labels } = useLanguage();
  const panelLabels = labels.desktop.rightPanel;
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedFile) return;
    onRenameFile(selectedFile.id, event.target.value);
  };

  return (
    <aside className="right-panel">
      <div className="title">{panelLabels.title}</div>
      {selectedFile ? (
        <div className="property-panel">
          <label className="property-field">
            <span className="property-label">{panelLabels.name}</span>
            <input
              className="property-input"
              value={getDesktopFileDisplayName(selectedFile, language)}
              onChange={handleNameChange}
            />
          </label>

          <div className="property-field">
            <span className="property-label">{panelLabels.type}</span>
            <div className="property-value">
              {getDesktopFileTypeLabels(language, selectedFile.type).label}
            </div>
          </div>

          <button
            className="action-button danger"
            disabled={!selectedFile.deletable}
            onClick={() => onDeleteFile(selectedFile.id)}
            type="button"
          >
            {panelLabels.delete}
          </button>
          <button
            className="action-button"
            onClick={() => onResetFile(selectedFile)}
            type="button"
          >
            {panelLabels.reset}
          </button>
        </div>
      ) : (
        <div className="property-empty">{panelLabels.noFileSelected}</div>
      )}
    </aside>
  );
}
