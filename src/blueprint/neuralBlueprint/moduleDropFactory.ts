import type { Edge } from '@xyflow/react';
import { PageType } from '../PageTypes';
import type {
  ModuleBaseNode,
  ModuleBaseNodeKind,
} from './ModuleBaseNodeTypes';
import {
  createModuleNodeData,
  RESNET18_STAGE_SPECS,
} from './moduleNodeFactory';
import type { ModulePalettePreset } from './moduleRegistry';

const NODE_WIDTH_OFFSET = 70;
const NODE_HEIGHT_OFFSET = 28;
const RESNET_STAGE_GAP = 180;

export function createDroppedModuleGroup(
  kind: ModuleBaseNodeKind,
  position: { x: number; y: number },
  palettePreset?: ModulePalettePreset,
  timestamp = Date.now(),
) {
  const stageCount = kind === 'ResNetStage'
    ? RESNET18_STAGE_SPECS.length
    : 1;
  const nodes = Array.from({ length: stageCount }, (_, index) => {
    const stageNumber = index + 1;
    const id = stageCount === 1
      ? `${kind}_${timestamp}`
      : `${kind}_${timestamp}_${stageNumber}`;
    const isPretrainedResNet = kind === 'ResNetStage'
      && palettePreset === 'pretrained-resnet-stage';
    const name = isPretrainedResNet
      ? `Pretrained ${stageNumber}`
      : kind === 'ResNetStage'
        ? `ResNetStage ${stageNumber}`
        : kind;
    const data = createModuleNodeData(kind, {
      id,
      name,
      type: PageType.NeuralBlueprint,
    }, {
      palettePreset,
      pretrainingOrder: isPretrainedResNet ? stageNumber : undefined,
      resNetStageIndex: kind === 'ResNetStage' ? stageNumber : undefined,
    });

    return {
      id,
      type: PageType.NeuralBlueprint,
      position: {
        x: position.x - NODE_WIDTH_OFFSET + index * RESNET_STAGE_GAP,
        y: position.y - NODE_HEIGHT_OFFSET,
      },
      data,
      draggable: true,
      selectable: true,
      selected: index === 0,
    } satisfies ModuleBaseNode;
  });
  const edges = nodes.slice(1).map((node, index): Edge => ({
    id: `${nodes[index].id}-${node.id}`,
    source: nodes[index].id,
    target: node.id,
  }));

  return { nodes, edges };
}
