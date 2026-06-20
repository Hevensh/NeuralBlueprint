import type {
  LinearNodeData,
  ModuleBaseNode,
  ModuleNodeData,
  ModuleStats,
} from '../ModuleBaseNodeTypes';
import { getLinearCorrBetweenNodes } from './correlation';

export function updateInferencePoints(nodes: ModuleBaseNode[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node.data]));
  const statsByNodeId = new Map(
    nodes.flatMap((node) => (
      node.data.stats ? [[node.id, node.data.stats] as const] : []
    )),
  );
  const groups = new Map<string, LinearNodeData[]>();

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

    const key = getInferenceOrderKey(data.inferenceTopologyOrder);
    const group = groups.get(key) ?? [];
    group.push(data);
    groups.set(key, group);
  });

  groups.forEach((groupNodes) => {
    const inferencePoint = Math.floor(
      computeWeightedInferencePoint(
        groupNodes,
        nodeMap,
        statsByNodeId,
      ),
    );

    groupNodes.forEach((node) => {
      node.inferencePoint = inferencePoint;
    });
  });
}

function computeWeightedInferencePoint(
  nodes: LinearNodeData[],
  nodeMap: Map<string, ModuleNodeData>,
  statsByNodeId: Map<string, ModuleStats>,
) {
  return nodes.reduce((sum, node, nodeIndex) => {
    const nodeStd = Math.sqrt(Math.max(node.stats?.variance ?? 0, 0));
    if (nodeStd <= 0 || !Number.isFinite(node.memoryPoint)) return sum;

    const correlatedStd = nodes.reduce((stdSum, otherNode, otherIndex) => {
      if (nodeIndex === otherIndex) return stdSum;

      return stdSum
        + getLinearCorrBetweenNodes(
          node.id,
          otherNode.id,
          statsByNodeId,
          nodeMap,
        ) * Math.sqrt(Math.max(otherNode.stats?.variance ?? 0, 0));
    }, nodeStd);

    return sum + (node.memoryPoint as number) * nodeStd / correlatedStd;
  }, 0);
}

function getInferenceOrderKey(orders: Set<number> | undefined) {
  return [...(orders ?? [])].sort((left, right) => left - right).join(',');
}
