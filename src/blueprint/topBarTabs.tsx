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
  onWorkspaceChange: (workspace: BlueprintPageType) => void;
}

export function BlueprintTopBarTabs({
  activeWorkspace,
  onWorkspaceChange,
}: BlueprintTopBarTabsProps) {
  return (
    <div className="top-bar-tabs">
      {blueprintTabs.map((tab) => (
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
