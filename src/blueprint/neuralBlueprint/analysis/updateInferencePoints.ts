import type {
  LinearNodeData,
  ModuleBaseNode,
} from '../ModuleBaseNodeTypes';
import {
  averageNodeMemoryPoint,
  collectInferenceModelIslands,
} from './inferenceMemoryProfile';

export function updateInferencePoints(nodes: ModuleBaseNode[]) {
  nodes.forEach((node) => {
    const { data } = node;
    if (data.kind !== 'Linear') return;

    if (
      !Number.isFinite(data.stats?.effectiveRank)
      || !Number.isFinite(data.statsBackward?.effectiveRank)
    ) {
      data.memoryPoint = undefined;
      data.inferencePoint = undefined;
      return;
    }

    data.memoryPoint = (
      data.stats?.effectiveRank ?? Number.NaN
    ) * (
      data.statsBackward?.effectiveRank ?? Number.NaN
    );
    data.inferencePoint = undefined;

    if (!data.inferenceTopologyOrder?.size) return;
  });

  collectInferenceModelIslands(nodes).forEach((island) => {
    const groups = new Map<string, LinearNodeData[]>();

    island.nodes.forEach((node) => {
      const { data } = node;
      if (
        data.kind !== 'Linear'
        || !data.inferenceTopologyOrder?.size
        || !Number.isFinite(data.memoryPoint)
      ) return;

      const key = getInferenceOrderKey(data.inferenceTopologyOrder);
      const group = groups.get(key) ?? [];
      group.push(data);
      groups.set(key, group);
    });

    groups.forEach((groupNodes) => {
      const inferencePoint = Math.floor(averageNodeMemoryPoint(groupNodes));

      groupNodes.forEach((node) => {
        node.inferencePoint = inferencePoint;
      });
    });
  });
}

function getInferenceOrderKey(orders: Set<number> | undefined) {
  return [...(orders ?? [])].sort((left, right) => left - right).join(',');
}
