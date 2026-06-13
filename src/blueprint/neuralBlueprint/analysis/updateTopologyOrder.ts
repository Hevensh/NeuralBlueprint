import type { ModuleBaseNode, ModuleBaseNodeData } from '../ModuleBaseNodeTypes';

export function updateTopologyOrder(nodes: ModuleBaseNode[]): void {
  const dataById = new Map(nodes.map((node) => [node.id, node.data]));
  const forwardOrderById = new Map<string, number>();
  const backwardOrderById = new Map<string, number>();

  nodes.forEach((node) => {
    node.data.forwardTopologyOrder = getForwardTopologyOrder(
      node.data,
      dataById,
      forwardOrderById,
      new Set(),
    );
    node.data.backwardTopologyOrder = getBackwardTopologyOrder(
      node.data,
      dataById,
      backwardOrderById,
      new Set(),
    );
  });
}

function getForwardTopologyOrder(
  node: ModuleBaseNodeData,
  dataById: Map<string, ModuleBaseNodeData>,
  orderById: Map<string, number>,
  visitingIds: Set<string>,
): number {
  const cachedOrder = orderById.get(node.id);
  if (cachedOrder !== undefined) return cachedOrder;
  if (visitingIds.has(node.id)) return 0;

  visitingIds.add(node.id);
  const validPredecessors = node.predecessors
    .map((predecessor) => dataById.get(predecessor.id))
    .filter((predecessor): predecessor is ModuleBaseNodeData => Boolean(predecessor));
  const order: number = validPredecessors.length === 0
    ? 0
    : Math.max(...validPredecessors.map((predecessor) => getForwardTopologyOrder(
      predecessor,
      dataById,
      orderById,
      visitingIds,
    ))) + 1;

  visitingIds.delete(node.id);
  orderById.set(node.id, order);
  return order;
}

function getBackwardTopologyOrder(
  node: ModuleBaseNodeData,
  dataById: Map<string, ModuleBaseNodeData>,
  orderById: Map<string, number>,
  visitingIds: Set<string>,
): number {
  const cachedOrder = orderById.get(node.id);
  if (cachedOrder !== undefined) return cachedOrder;
  if (visitingIds.has(node.id)) return 0;

  visitingIds.add(node.id);
  const validSuccessors = node.successors
    .map((successor) => dataById.get(successor.id))
    .filter((successor): successor is ModuleBaseNodeData => Boolean(successor));
  const order: number = validSuccessors.length === 0
    ? 0
    : Math.max(...validSuccessors.map((successor) => getBackwardTopologyOrder(
      successor,
      dataById,
      orderById,
      visitingIds,
    ))) + 1;

  visitingIds.delete(node.id);
  orderById.set(node.id, order);
  return order;
}
