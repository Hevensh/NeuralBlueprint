import {
  LANGUAGE_OPTIONS,
} from '../i18n/labels';
import { useLanguage } from '../i18n/useLanguage';
import { PropertyDropdown } from '../PropertyDropdown';
import type { AppSettings } from '../dataStorage/appSettingsStorage';

interface DesktopSettingsDialogProps {
  appSettings: AppSettings;
  developerActionDescription?: string;
  developerActionLabel?: string;
  onClose: () => void;
  onDeveloperAction?: () => void;
  onExit?: () => void;
  onResetCurrent?: () => void;
  resetDescription?: string;
  resetLabel?: string;
  setAppSettings: (settings: AppSettings) => void;
}

export function DesktopSettingsDialog({
  appSettings,
  developerActionDescription,
  developerActionLabel,
  onClose,
  onDeveloperAction,
  onExit,
  onResetCurrent,
  resetDescription,
  resetLabel,
  setAppSettings,
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

        <label className="desktop-settings-switch-row">
          <span>
            <strong>{dialogLabels.waitForTraining}</strong>
            <small>{dialogLabels.waitForTrainingDescription}</small>
          </span>
          <input
            checked={appSettings.waitForTraining}
            onChange={(event) => setAppSettings({
              ...appSettings,
              waitForTraining: event.target.checked,
            })}
            role="switch"
            type="checkbox"
          />
        </label>

        {(onDeveloperAction || onResetCurrent || onExit) && (
        <div className="desktop-settings-exit">
          <strong className="desktop-settings-section-title">
            {dialogLabels.developerOptions}
          </strong>
          {onDeveloperAction && developerActionLabel && (
            <>
              {developerActionDescription && <p>{developerActionDescription}</p>}
              <button
                className="action-button"
                onClick={onDeveloperAction}
                type="button"
              >
                {developerActionLabel}
              </button>
            </>
          )}
          {onResetCurrent && resetDescription && resetLabel && (
            <>
              <p>{resetDescription}</p>
              <button
                className="action-button"
                onClick={onResetCurrent}
                type="button"
              >
                {resetLabel}
              </button>
            </>
          )}

          {onExit && (
            <>
              <p>{dialogLabels.exitDescription}</p>
              <button
                className="action-button danger"
                onClick={onExit}
                type="button"
              >
                {dialogLabels.exit}
              </button>
            </>
          )}
        </div>
        )}
      </section>
    </div>
  );
}
