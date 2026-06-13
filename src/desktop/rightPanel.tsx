import type { ChangeEvent } from 'react';
import type { DesktopFile } from './desktopTypes';
import { getFileTypeLabel } from './fileNames';

interface DesktopRightPanelProp {
  selectedFile: DesktopFile | null;
  onRenameFile: (fileId: string, name: string) => void;
  onDeleteFile: (fileId: string) => void;
}

export function DesktopRightPanel({ selectedFile, onRenameFile, onDeleteFile }: DesktopRightPanelProp) {
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedFile) return;
    onRenameFile(selectedFile.id, event.target.value);
  };

  return (
    <aside className="right-panel">
      <div className="title">Properties</div>
      {selectedFile ? (
        <div className="property-panel">
          <label className="property-field">
            <span className="property-label">Name</span>
            <input
              className="property-input"
              value={selectedFile.name}
              onChange={handleNameChange}
            />
          </label>

          <div className="property-field">
            <span className="property-label">Type</span>
            <div className="property-value">
              {getFileTypeLabel(selectedFile.type)}
            </div>
          </div>

          <button
            className="action-button danger"
            disabled={!selectedFile.deletable}
            onClick={() => onDeleteFile(selectedFile.id)}
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="property-empty">No file selected</div>
      )}
    </aside>
  );
}
