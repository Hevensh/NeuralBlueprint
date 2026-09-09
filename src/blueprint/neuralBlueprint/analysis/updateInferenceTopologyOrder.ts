import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';
import {
  getDropoutInferenceStageAdvance,
  getReluInferenceStageAdvance,
} from './forward/utils/math';

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

    const stageAdvance = data.kind === 'ReLU'
      ? getReluInferenceStageAdvance(data.predecessors[0]?.stats)
      : data.kind === 'Dropout'
        ? getDropoutInferenceStageAdvance(data.dropoutRate)
      : data.kind === 'ResNetStage'
        ? 1
        : 0;
    const inferenceTopologyOrder = data.inCycle
      ? new Set<number>()
      : new Set([...inheritedOrders].map(
        (order) => roundInferenceOrder(order + stageAdvance),
      ));

    if (data.kind === 'ResNetStage') {
      data.internalInferenceTopologyOrder = data.inCycle
        ? new Set<number>()
        : new Set(inheritedOrders);
    }

    data.inferenceTopologyOrder = inferenceTopologyOrder;
    inferenceOrdersByNodeId.set(data.id, inferenceTopologyOrder);
  });
}

function roundInferenceOrder(value: number) {
  return Number(value.toFixed(3));
}
