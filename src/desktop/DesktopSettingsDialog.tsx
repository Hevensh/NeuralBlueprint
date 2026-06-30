import {
  LANGUAGE_OPTIONS,
} from '../i18n/labels';
import { useLanguage } from '../i18n/LanguageContext';
import { PropertyDropdown } from '../PropertyDropdown';

interface DesktopSettingsDialogProps {
  onClose: () => void;
  onExit: () => void;
  onResetAllFiles: () => void;
}

export function DesktopSettingsDialog({
  onClose,
  onExit,
  onResetAllFiles,
}: DesktopSettingsDialogProps) {
  const {
    language,
    labels,
    setLanguage,
  } = useLanguage();
  const dialogLabels = labels.desktop.settingsDialog;

  return (
    <div
      className="desktop-settings-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="desktop-settings-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="desktop-settings-header">
          <strong>{dialogLabels.title}</strong>
          <button
            aria-label={dialogLabels.close}
            className="desktop-settings-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="property-field">
          <span className="property-label">{dialogLabels.language}</span>
          <PropertyDropdown
            onChange={setLanguage}
            options={LANGUAGE_OPTIONS}
            value={language}
          />
        </div>

        <div className="desktop-settings-exit">
          <p>{dialogLabels.resetAllDescription}</p>
          <button
            className="action-button"
            onClick={onResetAllFiles}
            type="button"
          >
            {dialogLabels.resetAll}
          </button>

          <p>{dialogLabels.exitDescription}</p>
          <button
            className="action-button danger"
            onClick={onExit}
            type="button"
          >
            {dialogLabels.exit}
          </button>
        </div>
      </section>
    </div>
  );
}
