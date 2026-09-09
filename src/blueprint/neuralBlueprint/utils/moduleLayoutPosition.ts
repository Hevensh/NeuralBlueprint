import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';

const DEFAULT_NODE_HEIGHT = 72;

export const MODULE_LAYOUT_COLUMN_GAP = 240;
export const MODULE_LAYOUT_START_X = 120;
export const MODULE_LAYOUT_START_Y = 180;

export interface ModuleLayoutPositionOptions {
  columnOrder: number;
  level: number;
  nodeHeight: number;
  layoutUnitHeight: number;
  origin?: { x: number; y: number };
  columnGap?: number;
  levelStep?: number;
}

export function mapModuleLayoutPosition({
  columnOrder,
  level,
  nodeHeight,
  layoutUnitHeight,
  origin = { x: MODULE_LAYOUT_START_X, y: MODULE_LAYOUT_START_Y },
  columnGap = MODULE_LAYOUT_COLUMN_GAP,
  levelStep = layoutUnitHeight / 2,
}: ModuleLayoutPositionOptions) {
  const verticalCenterOffset = (layoutUnitHeight - nodeHeight) / 2;

  return {
    x: origin.x + columnOrder * columnGap,
    y: origin.y + level * levelStep + verticalCenterOffset,
  };
}

export function getNodeHeight(node?: Pick<ModuleBaseNode, 'measured' | 'height'>) {
  return (node?.measured?.height ?? node?.height ?? DEFAULT_NODE_HEIGHT) + 32;
}
