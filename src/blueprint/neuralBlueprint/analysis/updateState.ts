import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';
import { applyTopologyOrders } from './updateTopologyOrder';
import { updateModuleStats } from './updateModuleStats';

export function updateState(nodes: ModuleBaseNode[]): ModuleBaseNode[] {
  const nextNodes = applyTopologyOrders(nodes);
  updateModuleStats(nextNodes);
  return nextNodes;
}
