import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';
import { updateInferencePoints } from './updateInferencePoints';
import { updateInferenceTopologyOrders } from './updateInferenceTopologyOrder';
import { applyTopologyOrders } from './updateTopologyOrder';
import { updateModuleStats } from './updateModuleStats';

export function updateState(nodes: ModuleBaseNode[]): ModuleBaseNode[] {
  const nextNodes = applyTopologyOrders(nodes);
  updateModuleStats(nextNodes);
  updateInferenceTopologyOrders(nextNodes);
  updateInferencePoints(nextNodes);
  return nextNodes;
}
