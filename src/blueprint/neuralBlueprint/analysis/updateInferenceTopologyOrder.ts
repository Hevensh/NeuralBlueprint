import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';

export function updateInferenceTopologyOrders(nodes: ModuleBaseNode[]) {
  const inferenceOrdersByNodeId = new Map<string, Set<number>>();
  const sortedNodes = [...nodes].sort((left, right) => (
    (left.data.forwardTopologyOrder ?? 0)
      - (right.data.forwardTopologyOrder ?? 0)
  ));

  sortedNodes.forEach((node) => {
    const { data } = node;
    const inheritedOrders = new Set<number>();

    if (data.predecessors.length === 0) {
      inheritedOrders.add(0);
    } else {
      data.predecessors.forEach((predecessor) => {
        inferenceOrdersByNodeId.get(predecessor.id)?.forEach((order) => {
          inheritedOrders.add(order);
        });
      });
    }

    const inferenceTopologyOrder = data.inCycle
      ? new Set<number>()
      : new Set([...inheritedOrders].map(
        (order) => order + Number(data.kind === 'ReLU'),
      ));

    data.inferenceTopologyOrder = inferenceTopologyOrder;
    inferenceOrdersByNodeId.set(data.id, inferenceTopologyOrder);
  });
}
