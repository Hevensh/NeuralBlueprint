import { PageType, type PageType as BlueprintPageType } from './PageTypes';

const blueprintTabs: Array<{
  label: string;
  workspace: BlueprintPageType;
}> = [
  { label: 'Neural Blueprint', workspace: PageType.NeuralBlueprint },
  { label: 'Knowledge Graph', workspace: PageType.KnowledgeGraph },
  { label: 'Training Process', workspace: PageType.TrainingProcess },
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
          key={tab.label}
          onClick={() => onWorkspaceChange(tab.workspace)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
