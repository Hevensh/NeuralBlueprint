import {
  type ModuleBaseNode,
  type ModuleNodeData,
} from '../ModuleBaseNodeTypes';
import { DEFAULT_OUTPUT_DIM } from '../moduleNodeFactory';

export function applyTopologyOrders(nodes: ModuleBaseNode[]): ModuleBaseNode[] {
  const nodeMap = new Map(nodes.map((node) => [node.data.id, node]));
  const forwardOrderMap = new Map<string, number>();
  const backwardOrderMap = new Map<string, number>();
  const cycleNodeIds = new Set<string>();
  const warnedMissingLinks = new Set<string>();

  const getForwardTopologyOrder = createTopologyOrderResolver({
    nodeMap,
    orderMap: forwardOrderMap,
    cycleNodeIds,
    warnedMissingLinks,
    getLinkedData: (node) => node.predecessors,
  });
  const getBackwardTopologyOrder = createTopologyOrderResolver({
    nodeMap,
    orderMap: backwardOrderMap,
    cycleNodeIds,
    warnedMissingLinks,
    getLinkedData: (node) => node.successors,
  });

  nodes.forEach((node) => {
    getForwardTopologyOrder(node.data.id);
  });
  nodes.forEach((node) => {
    getBackwardTopologyOrder(node.data.id);
  });

  const dataById = new Map<string, ModuleNodeData>();
  nodes.forEach((node) => {
    const id = node.data.id;
    const normalizedData = normalizeFixedOutputRank(node.data);
    dataById.set(id, {
      ...normalizedData,
      forwardTopologyOrder: cycleNodeIds.has(id) ? 0 : forwardOrderMap.get(id) ?? 0,
      backwardTopologyOrder: cycleNodeIds.has(id) ? 0 : backwardOrderMap.get(id) ?? 0,
      inCycle: cycleNodeIds.has(id),
    });
  });

  nodes.forEach((node) => {
    const data = dataById.get(node.data.id);
    if (!data) return;

    data.predecessors = node.data.predecessors
      .map((predecessor) => dataById.get(predecessor.id))
      .filter((predecessor): predecessor is ModuleNodeData => Boolean(predecessor));
    data.successors = node.data.successors
      .map((successor) => dataById.get(successor.id))
      .filter((successor): successor is ModuleNodeData => Boolean(successor));
  });

  return nodes.map((node) => ({
    ...node,
    data: dataById.get(node.data.id) ?? node.data,
  }));
}

function normalizeFixedOutputRank(node: ModuleNodeData): ModuleNodeData {
  if (node.kind === 'Output') {
    return {
      ...node,
      neededOutputDim: Number.isFinite(node.neededOutputDim)
        ? node.neededOutputDim
        : Number.isFinite(node.stats?.rank)
          ? node.stats?.rank as number
          : DEFAULT_OUTPUT_DIM,
    };
  }

  if (node.kind !== 'Input' && node.kind !== 'Linear') return node;

  const outFeatures = Number.isFinite(node.outFeatures)
    ? node.outFeatures
    : Number.isFinite(node.stats?.rank)
      ? node.stats?.rank as number
      : DEFAULT_OUTPUT_DIM;

  return {
    ...node,
    outFeatures,
  };
}

interface TopologyOrderResolverOptions {
  nodeMap: Map<string, ModuleBaseNode>;
  orderMap: Map<string, number>;
  cycleNodeIds: Set<string>;
  warnedMissingLinks: Set<string>;
  getLinkedData: (node: ModuleNodeData) => ModuleNodeData[];
}

function createTopologyOrderResolver({
  nodeMap,
  orderMap,
  cycleNodeIds,
  warnedMissingLinks,
  getLinkedData,
}: TopologyOrderResolverOptions) {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];

  const getTopologyOrder = (nodeId: string): number => {
    const cachedOrder = orderMap.get(nodeId);
    if (cachedOrder !== undefined) return cachedOrder;
    if (cycleNodeIds.has(nodeId)) return 0;
    if (visiting.has(nodeId)) {
      markCycleNodes(nodeId, path, cycleNodeIds);
      return 0;
    }
    if (visited.has(nodeId)) return orderMap.get(nodeId) ?? 0;

    const node = nodeMap.get(nodeId);
    if (!node) {
      warnMissingLink(nodeId, warnedMissingLinks);
      return 0;
    }

    visiting.add(nodeId);
    path.push(nodeId);

    const linkedOrders = getLinkedData(node.data)
      .map((linkedData) => {
        const linkedNode = nodeMap.get(linkedData.id);
        if (!linkedNode) {
          warnMissingLink(linkedData.id, warnedMissingLinks);
          return undefined;
        }
        return getTopologyOrder(linkedNode.data.id);
      })
      .filter((order): order is number => order !== undefined);

    path.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);

    const order = cycleNodeIds.has(nodeId)
      ? 0
      : linkedOrders.length === 0
        ? 0
        : Math.max(...linkedOrders) + 1;

    orderMap.set(nodeId, order);
    return order;
  };

  return getTopologyOrder;
}

function markCycleNodes(
  nodeId: string,
  path: string[],
  cycleNodeIds: Set<string>,
) {
  const cycleStartIndex = path.indexOf(nodeId);
  if (cycleStartIndex === -1) {
    cycleNodeIds.add(nodeId);
    return;
  }

  path.slice(cycleStartIndex).forEach((cycleNodeId) => {
    cycleNodeIds.add(cycleNodeId);
  });
}

function warnMissingLink(nodeId: string, warnedMissingLinks: Set<string>) {
  if (warnedMissingLinks.has(nodeId)) return;

  warnedMissingLinks.add(nodeId);
  console.warn(`Topology order skipped missing node link: ${nodeId}`);
}
