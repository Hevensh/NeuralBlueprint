import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';
import { updateTopologyOrder } from './updateTopologyOrder';
import { updateVarianceStats } from './updateVarianceStats';

export function updateState(nodes: ModuleBaseNode[]): void {
  updateTopologyOrder(nodes);
  updateVarianceStats(nodes);
  console.log('state analysed')
}
