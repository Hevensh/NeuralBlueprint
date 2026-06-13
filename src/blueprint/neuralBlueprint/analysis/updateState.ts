import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';
import { applyTopologyOrders } from './updateTopologyOrder';
import { updateRankStats } from './updateRankStats';
import { updateVarianceStats } from './updateVarianceStats';

export function updateState(nodes: ModuleBaseNode[]): ModuleBaseNode[] {
  const nextNodes = applyTopologyOrders(nodes);
  updateVarianceStats(nextNodes);
  updateRankStats(nextNodes);
  return nextNodes;
}
