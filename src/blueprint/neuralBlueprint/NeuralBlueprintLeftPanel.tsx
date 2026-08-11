import type { DragEvent } from 'react';
import { useLabels } from '../../i18n/LanguageContext';
import type { ModuleBaseNodeKind } from './ModuleBaseNodeTypes';

export const MODULE_BASE_NODE_DRAG_TYPE = 'application/neural-blueprint-module-node';

interface ModuleBaseNodeTemplate {
  kind: ModuleBaseNodeKind;
}

const moduleBaseNodeTemplates: ModuleBaseNodeTemplate[] = [
  { kind: 'Input' },
  { kind: '3DInput' },
  { kind: 'Linear' },
  { kind: 'CNN' },
  { kind: 'Pooling' },
  { kind: 'Flatten' },
  { kind: 'GlobalPooling' },
  { kind: 'ReLU' },
  { kind: 'Dropout' },
  { kind: 'Sum' },
  { kind: 'Output' },
];

function getModuleBaseNodeIcon(kind: ModuleBaseNodeKind) {
  return kind === 'Linear'
    ? 'W'
    : kind === 'CNN'
      ? 'C'
      : kind === 'Pooling'
        ? 'P'
        : kind === 'Flatten'
          ? 'F'
          : kind === 'GlobalPooling'
            ? 'GP'
    : kind === 'ReLU'
      ? 'R'
      : kind === 'Dropout'
        ? 'D'
        : kind === 'Sum'
          ? '+'
          : kind === 'Output'
            ? 'Y'
            : kind === '3DInput'
              ? '3D'
              : 'X';
}

function handleDragStart(
  event: DragEvent<HTMLDivElement>,
  kind: ModuleBaseNodeKind,
) {
  event.dataTransfer.setData(MODULE_BASE_NODE_DRAG_TYPE, kind);
  event.dataTransfer.effectAllowed = 'copy';
}

interface NeuralBlueprintLeftPanelProp {
  availableModuleKinds: ModuleBaseNodeKind[];
  onArrangeNodes: () => void;
}

export function NeuralBlueprintLeftPanel({
  availableModuleKinds,
  onArrangeNodes,
}: NeuralBlueprintLeftPanelProp) {
  const labels = useLabels().neuralBlueprint.leftPanel;
  const availableModules = moduleBaseNodeTemplates.filter((module) => (
    availableModuleKinds.includes(module.kind)
  ));

  return (
    <aside className="left-panel">
      <div className="panel-section-spacer" />
      <button className="action-button" onClick={onArrangeNodes} type="button">
        {labels.arrangeNodes}
      </button>
      <div className="panel-section-spacer" />
      <div className="title">{labels.neuralModules}</div>
      <div className="module-list">
        {availableModules.map((module) => (
          <div
            className="module-card"
            data-guide-target={`module-card-${module.kind}`}
            draggable
            key={module.kind}
            onDragStart={(event) => handleDragStart(event, module.kind)}
          >
            <div className="module-card-icon module-base-node-icon">
              {getModuleBaseNodeIcon(module.kind)}
            </div>
            <div className="module-card-copy">
              <div className="module-card-title">{module.kind}</div>
              <div className="module-card-description">
                {labels.moduleDescriptions[module.kind]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
