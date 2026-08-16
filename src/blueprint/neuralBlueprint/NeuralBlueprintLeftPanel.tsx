import { useState, type DragEvent } from 'react';
import { useLabels } from '../../i18n/useLanguage';
import type { ModuleBaseNodeKind } from './ModuleBaseNodeTypes';
import {
  MODULE_PALETTE_GROUPS,
  MODULE_PALETTE_DEFINITIONS,
  type ModulePaletteDefinition,
  type ModulePaletteGroup,
  type ModulePalettePreset,
} from './moduleRegistry';

export const MODULE_BASE_NODE_DRAG_TYPE = 'application/neural-blueprint-module-node';
export const MODULE_BASE_NODE_PRESET_DRAG_TYPE =
  'application/neural-blueprint-module-node-preset';

function handleDragStart(
  event: DragEvent<HTMLDivElement>,
  kind: ModuleBaseNodeKind,
  preset?: ModulePalettePreset,
) {
  event.dataTransfer.setData(MODULE_BASE_NODE_DRAG_TYPE, kind);
  event.dataTransfer.setData(MODULE_BASE_NODE_PRESET_DRAG_TYPE, preset ?? '');
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
  const availableModules = MODULE_PALETTE_DEFINITIONS.filter((module) => (
    availableModuleKinds.includes(module.kind)
  ));
  const availableGroups = MODULE_PALETTE_GROUPS.map((group) => ({
    group,
    modules: availableModules.filter((module) => module.paletteGroup === group),
  })).filter(({ modules }) => modules.length > 0);
  const [openGroups, setOpenGroups] = useState<Set<ModulePaletteGroup>>(
    () => new Set(MODULE_PALETTE_GROUPS.filter(isModuleGroupOpenByDefault)),
  );
  const toggleGroup = (group: ModulePaletteGroup) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <aside className="left-panel">
      <div className="panel-section-spacer" />
      <button className="action-button" onClick={onArrangeNodes} type="button">
        {labels.arrangeNodes}
      </button>
      <div className="panel-section-spacer" />
      <div className="title">{labels.neuralModules}</div>
      <div className="module-list">
        {availableGroups.map(({ group, modules }) => (
          <section
            className={`module-group ${openGroups.has(group) ? 'open' : ''}`}
            key={group}
          >
            <button
              aria-expanded={openGroups.has(group)}
              className="module-group-summary"
              onClick={() => toggleGroup(group)}
              type="button"
            >
              <span>{labels.moduleGroups[group]}</span>
              <span className="module-group-count">{modules.length}</span>
            </button>
            {openGroups.has(group) && <div className="module-group-list">
              {modules.map((module) => (
                <div
                  className="module-card"
                  data-guide-target={`module-card-${module.id}`}
                  draggable
                  key={module.id}
                  onDragStart={(event) => handleDragStart(
                    event,
                    module.kind,
                    module.preset,
                  )}
                >
                  <div className="module-card-icon module-base-node-icon">
                    {module.icon}
                  </div>
                  <div className="module-card-copy">
                    <div className="module-card-title">
                      {moduleTitle(
                        module,
                        labels.resNet,
                        labels.pretrainedResNet,
                      )}
                    </div>
                    <div className="module-card-description">
                      {module.preset === 'pretrained-resnet-stage'
                        ? labels.pretrainedResNetDescription
                        : labels.moduleDescriptions[module.kind]}
                    </div>
                  </div>
                </div>
              ))}
            </div>}
          </section>
        ))}
      </div>
    </aside>
  );
}

function isModuleGroupOpenByDefault(group: ModulePaletteGroup) {
  return group === 'inputOutput'
    || group === 'layers'
    || group === 'networks';
}

function moduleTitle(
  module: ModulePaletteDefinition,
  resNet: string,
  pretrainedResNet: string,
) {
  return module.preset === 'pretrained-resnet-stage'
    ? pretrainedResNet
    : module.kind === 'ResNetStage'
      ? resNet
      : module.kind;
}
