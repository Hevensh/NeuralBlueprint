import {
  LANGUAGE_OPTIONS,
} from '../i18n/labels';
import { useLanguage } from '../i18n/LanguageContext';
import { PropertyDropdown } from '../PropertyDropdown';

interface DesktopSettingsDialogProps {
  onClose: () => void;
  onExit: () => void;
  onResetCurrent: () => void;
  resetDescription: string;
  resetLabel: string;
}

export function DesktopSettingsDialog({
  onClose,
  onExit,
  onResetCurrent,
  resetDescription,
  resetLabel,
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
          <strong className="desktop-settings-section-title">
            {dialogLabels.developerOptions}
          </strong>
          <p>{resetDescription}</p>
          <button
            className="action-button"
            onClick={onResetCurrent}
            type="button"
          >
            {resetLabel}
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
