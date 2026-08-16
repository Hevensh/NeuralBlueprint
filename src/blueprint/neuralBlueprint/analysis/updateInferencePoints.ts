import type {
  CNNNodeData,
  LinearNodeData,
  ModuleBaseNode,
  ModuleNodeData,
  PatchEmbeddingNodeData,
  ResNetStageNodeData,
} from '../ModuleBaseNodeTypes';
import {
  collectInferenceModelIslands,
  computeInferenceGroupProfile,
} from './inferenceMemoryProfile';

type TrainableNodeData = LinearNodeData | CNNNodeData | PatchEmbeddingNodeData | ResNetStageNodeData;

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

    data.memoryPoint = data.kind === 'ResNetStage'
      ? sumInternalMemoryPoint(data.internalConvs ?? [])
      : (
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

      const key = getInferenceOrderKey(
        data.kind === 'ResNetStage'
          ? data.internalInferenceTopologyOrder
          : data.inferenceTopologyOrder,
      );
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

function sumInternalMemoryPoint(
  internals: Array<{ memoryPoint?: number }>,
) {
  return internals.reduce(
    (sum, internal) => sum + Math.max(0, internal.memoryPoint ?? 0),
    0,
  );
}

function isTrainableNode(data: ModuleNodeData): data is TrainableNodeData {
  return data.kind === 'Linear'
    || data.kind === 'CNN'
    || data.kind === 'PatchEmbedding'
    || data.kind === 'ResNetStage';
}

function getInferenceOrderKey(orders: Set<number> | undefined) {
  return [...(orders ?? [])].sort((left, right) => left - right).join(',');
}
