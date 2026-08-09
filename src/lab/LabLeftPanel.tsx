import { useLanguage } from '../i18n/LanguageContext';

interface LabLeftPanelProps {
  onOpenSettings: () => void;
}

export function LabLeftPanel({ onOpenSettings }: LabLeftPanelProps) {
  const { labels } = useLanguage();
  const navigation = labels.lab.navigation;

  return (
    <aside className="lab-left-panel">
      <button
        className="lab-left-panel-settings"
        onClick={onOpenSettings}
        type="button"
      >
        {labels.desktop.leftPanel.settings}
      </button>

      <div className="lab-left-panel-title">{navigation.places}</div>
      <nav className="lab-place-list">
        <button className="lab-place-button current" disabled type="button">
          <span>{navigation.laboratory}</span>
          <small>{navigation.current}</small>
        </button>
        <button className="lab-place-button" disabled type="button">
          <span>{navigation.classroom}</span>
          <small>{navigation.comingSoon}</small>
        </button>
      </nav>
    </aside>
  );
}
