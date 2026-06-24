import type { DragEvent } from 'react';
import type { ModuleBaseNodeKind } from './ModuleBaseNodeTypes';

export const MODULE_BASE_NODE_DRAG_TYPE = 'application/neural-blueprint-module-node';

interface ModuleBaseNodeTemplate {
  kind: ModuleBaseNodeKind;
  title: string;
  description: string;
}

const moduleBaseNodeTemplates: ModuleBaseNodeTemplate[] = [
  {
    kind: 'Input',
    title: 'Input',
    description: 'Network input tensor',
  },
  {
    kind: 'Linear',
    title: 'Linear',
    description: 'Affine feature transform',
  },
  {
    kind: 'ReLU',
    title: 'ReLU',
    description: 'Activation and sparsity',
  },
  {
    kind: 'Dropout',
    title: 'Dropout',
    description: 'Random feature deletion',
  },
  {
    kind: 'Sum',
    title: 'Sum',
    description: 'Merge multiple inputs',
  },
  {
    kind: 'Output',
    title: 'Output',
    description: 'Network output tensor',
  },
];

function getModuleBaseNodeIcon(kind: ModuleBaseNodeKind) {
  return kind === 'Linear'
    ? 'W'
    : kind === 'ReLU'
      ? 'R'
      : kind === 'Dropout'
        ? 'D'
        : kind === 'Sum'
          ? '+'
          : kind === 'Output'
            ? 'Y'
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
  const availableModules = moduleBaseNodeTemplates.filter((module) => (
    availableModuleKinds.includes(module.kind)
  ));

  return (
    <aside className="left-panel">
      <div className="panel-section-spacer" />
      <button className="action-button" onClick={onArrangeNodes} type="button">
        Arrange Nodes
      </button>
      <div className="panel-section-spacer" />
      <div className="title">Neural Modules</div>
      <div className="module-list">
        {availableModules.map((module) => (
          <div
            className="module-card"
            draggable
            key={module.kind}
            onDragStart={(event) => handleDragStart(event, module.kind)}
          >
            <div className="module-card-icon module-base-node-icon">
              {getModuleBaseNodeIcon(module.kind)}
            </div>
            <div className="module-card-copy">
              <div className="module-card-title">{module.title}</div>
              <div className="module-card-description">{module.description}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
