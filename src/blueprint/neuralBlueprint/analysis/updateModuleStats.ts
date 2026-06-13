import type {
  ModuleBaseNode,
  ModuleBaseNodeData,
  ModuleStats,
} from '../ModuleBaseNodeTypes';
import { forwardModuleStats } from './forward/forwardModuleStats';
import {
  getDisconnectedStats,
  getEmptyStats,
} from './forward/utils/moduleStats';

export function updateModuleStats(nodes: ModuleBaseNode[]): void {
  runForwardStats(nodes.map((node) => node.data));
}

export function runForwardStats(
  nodes: ModuleBaseNodeData[],
): Map<string, ModuleStats> {
  const stats = new Map<string, ModuleStats>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const sortedNodes = [...nodes].sort((left, right) => (
    (left.forwardTopologyOrder ?? 0) - (right.forwardTopologyOrder ?? 0)
  ));

  sortedNodes.forEach((node) => {
    if (node.inCycle) {
      const emptyStats = getEmptyStats(node);
      node.stats = emptyStats;
      stats.set(node.id, emptyStats);
      return;
    }

    if (node.kind !== 'Input' && node.predecessors.length === 0) {
      const disconnectedStats = getDisconnectedStats(node);
      node.sumInputPairStats = undefined;
      node.stats = disconnectedStats;
      stats.set(node.id, disconnectedStats);
      return;
    }

    const inputNodes: ModuleBaseNodeData[] = [];
    const inputs = node.predecessors
      .map((predecessor) => {
        const inputNode = nodeMap.get(predecessor.id);
        const inputStats = stats.get(predecessor.id);
        if (inputNode && inputStats) {
          inputNodes.push(inputNode);
        }
        return inputStats;
      })
      .filter((inputStats): inputStats is ModuleStats => Boolean(inputStats));
    const forward = node.forwardStats ?? forwardModuleStats;
    const result = forward({
      node,
      inputs,
      inputNodes,
      nodeMap,
      statsByNodeId: stats,
    });

    node.forwardStats = forward;
    node.sumInputPairStats = result.sumInputPairStats;
    node.stats = result.stats;
    stats.set(node.id, result.stats);
  });

  return stats;
}
