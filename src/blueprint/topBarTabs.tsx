import { PageType, type PageType as BlueprintPageType } from './PageTypes';
import { useLabels } from '../i18n/useLanguage';

const blueprintTabs: Array<{
  labelKey: 'neuralBlueprint' | 'knowledgeGraph' | 'trainingProcess';
  workspace: BlueprintPageType;
}> = [
  { labelKey: 'neuralBlueprint', workspace: PageType.NeuralBlueprint },
  { labelKey: 'knowledgeGraph', workspace: PageType.KnowledgeGraph },
  { labelKey: 'trainingProcess', workspace: PageType.TrainingProcess },
];

interface BlueprintTopBarTabsProps {
  activeWorkspace: BlueprintPageType;
  showNeuralBlueprintTab?: boolean;
  showKnowledgeGraphTab?: boolean;
  onWorkspaceChange: (workspace: BlueprintPageType) => void;
}

export function BlueprintTopBarTabs({
  activeWorkspace,
  showNeuralBlueprintTab = true,
  showKnowledgeGraphTab = true,
  onWorkspaceChange,
}: BlueprintTopBarTabsProps) {
  const labels = useLabels();
  const visibleTabs = blueprintTabs.filter((tab) => {
    if (tab.workspace === PageType.NeuralBlueprint) {
      return showNeuralBlueprintTab;
    }
    if (tab.workspace === PageType.KnowledgeGraph) {
      return showKnowledgeGraphTab;
    }
    return true;
  });

  return (
    <div className="top-bar-tabs">
      {visibleTabs.map((tab) => (
        <button
          className={`top-bar-tab ${tab.workspace === activeWorkspace ? 'active' : ''}`}
          data-guide-target={`workspace-tab-${tab.workspace}`}
          key={tab.workspace}
          onClick={() => onWorkspaceChange(tab.workspace)}
          type="button"
        >
          {labels.workspaceTabs[tab.labelKey]}
        </button>
      ))}
    </div>
  );
}
