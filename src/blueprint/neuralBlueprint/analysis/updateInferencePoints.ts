import type {
  CNNNodeData,
  LinearNodeData,
  ModuleBaseNode,
  ModuleNodeData,
} from '../ModuleBaseNodeTypes';
import {
  collectInferenceModelIslands,
  computeInferenceGroupProfile,
} from './inferenceMemoryProfile';

type TrainableNodeData = LinearNodeData | CNNNodeData;

export function updateInferencePoints(nodes: ModuleBaseNode[]) {
  nodes.forEach((node) => {
    const { data } = node;
    if (!isTrainableNode(data)) return;

    if (
      !Number.isFinite(data.stats?.rank.effectiveRank)
      || !Number.isFinite(data.statsBackward?.rank.effectiveRank)
    ) {
      data.memoryPoint = undefined;
      data.inferencePoint = undefined;
      return;
    }

    data.memoryPoint = (
      data.stats?.rank.effectiveRank ?? Number.NaN
    ) * (
      data.statsBackward?.rank.effectiveRank ?? Number.NaN
    );
    data.inferencePoint = undefined;

    if (!data.inferenceTopologyOrder?.size) return;
  });

  collectInferenceModelIslands(nodes).forEach((island) => {
    const groups = new Map<string, TrainableNodeData[]>();

    island.nodes.forEach((node) => {
      const { data } = node;
      if (
        !isTrainableNode(data)
        || !data.inferenceTopologyOrder?.size
        || !Number.isFinite(data.memoryPoint)
      ) return;

      const key = getInferenceOrderKey(data.inferenceTopologyOrder);
      const group = groups.get(key) ?? [];
      group.push(data);
      groups.set(key, group);
    });

    groups.forEach((groupNodes) => {
      const inferencePoint = Math.floor(
        computeInferenceGroupProfile(
          groupNodes,
          island.nodes.map((node) => node.data),
        ).memoryPoint,
      );

      groupNodes.forEach((node) => {
        node.inferencePoint = inferencePoint;
      });
    });
  });
}

function isTrainableNode(data: ModuleNodeData): data is TrainableNodeData {
  return data.kind === 'Linear' || data.kind === 'CNN';
}

function getInferenceOrderKey(orders: Set<number> | undefined) {
  return [...(orders ?? [])].sort((left, right) => left - right).join(',');
}
