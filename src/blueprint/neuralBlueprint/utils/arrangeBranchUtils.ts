import type { ModuleNodeData } from '../ModuleBaseNodeTypes';
import type { ArrangeNodeBlock } from './arrangeCycleBlocks';
import {
  collectAncestorsWithoutPassingThroughBlocked,
  collectDescendantsWithoutPassingThroughBlocked,
  getDataBackwardTopologyOrder,
  getDataTopologyOrder,
} from './arrangeNodesUtils';

export type BranchSide = 'source' | 'sink';

export interface CandidateBranch {
  side: BranchSide;
  nodeIds: Set<string>;
}

interface ScoredCandidateBranch extends CandidateBranch {
  connectionCount: number;
  maxConnectionSpan: number;
}

interface FindBranchOptions {
  sourceIds: string[];
  sinkIds: string[];
  nodeById: Map<string, ModuleNodeData>;
  blockedNodeIds: Set<string>;
  assignedColumnOrders: Map<string, number>;
  maxForwardOrder: number;
  blockById: Map<string, ArrangeNodeBlock>;
}

export function findLargestRemainingBranch({
  sourceIds,
  sinkIds,
  nodeById,
  blockedNodeIds,
  assignedColumnOrders,
  maxForwardOrder,
  blockById,
}: FindBranchOptions): CandidateBranch | null {
  let preferredBranch: ScoredCandidateBranch | null = null;
  const sourceNodesConnectedToM = collectNodesConnectedToM(
    blockedNodeIds,
    nodeById,
    'source',
  );
  const sinkNodesConnectedToM = collectNodesConnectedToM(
    blockedNodeIds,
    nodeById,
    'sink',
  );

  const acceptBranch = (side: BranchSide, nodeIds: Set<string>) => {
    if (nodeIds.size === 0) return;

    const candidate: ScoredCandidateBranch = {
      side,
      nodeIds,
      ...getBranchConnectionMetrics({
        side,
        nodeIds,
        assignedNodeIds: blockedNodeIds,
        assignedColumnOrders,
        nodeById,
        maxForwardOrder,
        blockById,
      }),
    };

    if (!preferredBranch || isBranchPreferred(candidate, preferredBranch)) {
      preferredBranch = candidate;
    }
  };

  sourceIds.forEach((sourceId) => {
    const sourceDescendants = collectDescendantsWithoutPassingThroughBlocked(
      nodeById.get(sourceId)!,
      blockedNodeIds,
    );

    acceptBranch(
      'source',
      intersectNodeIds(sourceDescendants, sourceNodesConnectedToM),
    );
  });

  sinkIds.forEach((sinkId) => {
    const sinkAncestors = collectAncestorsWithoutPassingThroughBlocked(
      nodeById.get(sinkId)!,
      blockedNodeIds,
    );

    acceptBranch(
      'sink',
      intersectNodeIds(sinkAncestors, sinkNodesConnectedToM),
    );
  });

  return preferredBranch;
}

function collectNodesConnectedToM(
  assignedNodeIds: Set<string>,
  nodeById: Map<string, ModuleNodeData>,
  side: BranchSide,
) {
  const connectedNodeIds = new Set<string>();

  assignedNodeIds.forEach((nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) return;

    const reachableNodeIds = side === 'source'
      ? collectAncestorsWithoutPassingThroughBlocked(node, assignedNodeIds)
      : collectDescendantsWithoutPassingThroughBlocked(node, assignedNodeIds);

    reachableNodeIds.forEach((reachableNodeId) => {
      connectedNodeIds.add(reachableNodeId);
    });
  });

  return connectedNodeIds;
}

function intersectNodeIds(left: Set<string>, right: Set<string>) {
  const result = new Set<string>();
  const smallerSet = left.size <= right.size ? left : right;
  const largerSet = left.size <= right.size ? right : left;

  smallerSet.forEach((nodeId) => {
    if (largerSet.has(nodeId)) {
      result.add(nodeId);
    }
  });

  return result;
}

export function getBranchColumnOrder(
  side: BranchSide,
  maxForwardOrder: number,
  blockById: Map<string, ArrangeNodeBlock>,
) {
  return side === 'sink'
    ? (node: ModuleNodeData) => (
      maxForwardOrder
      - getDataBackwardTopologyOrder(node)
      - getBlockColumnWidth(node.id, blockById)
      + 1
    )
    : getDataTopologyOrder;
}

export function getBlockColumnWidth(
  nodeId: string,
  blockById: Map<string, ArrangeNodeBlock>,
) {
  return blockById.get(nodeId)?.columnWidth ?? 1;
}

export function removeRootsCoveredByBranch(
  branch: CandidateBranch,
  activeSourceIds: Set<string>,
  activeSinkIds: Set<string>,
) {
  const coveredRootIds = branch.side === 'source'
    ? activeSinkIds
    : activeSourceIds;

  coveredRootIds.forEach((rootId) => {
    if (branch.nodeIds.has(rootId)) {
      coveredRootIds.delete(rootId);
    }
  });
}

function isBranchPreferred(
  candidate: ScoredCandidateBranch,
  current: ScoredCandidateBranch,
) {
  if (candidate.nodeIds.size !== current.nodeIds.size) {
    return candidate.nodeIds.size > current.nodeIds.size;
  }
  if (candidate.connectionCount !== current.connectionCount) {
    return candidate.connectionCount > current.connectionCount;
  }

  return candidate.maxConnectionSpan < current.maxConnectionSpan;
}

function getBranchConnectionMetrics({
  side,
  nodeIds,
  assignedNodeIds,
  assignedColumnOrders,
  nodeById,
  maxForwardOrder,
  blockById,
}: {
  side: BranchSide;
  nodeIds: Set<string>;
  assignedNodeIds: Set<string>;
  assignedColumnOrders: Map<string, number>;
  nodeById: Map<string, ModuleNodeData>;
  maxForwardOrder: number;
  blockById: Map<string, ArrangeNodeBlock>;
}) {
  const getCandidateColumn = getBranchColumnOrder(side, maxForwardOrder, blockById);
  let connectionCount = 0;
  let maxConnectionSpan = 0;

  nodeIds.forEach((nodeId) => {
    const node = nodeById.get(nodeId)!;
    const linkedNodes = side === 'source' ? node.successors : node.predecessors;

    linkedNodes.forEach((assignedNode) => {
      if (!assignedNodeIds.has(assignedNode.id)) return;

      connectionCount += 1;
      maxConnectionSpan = Math.max(
        maxConnectionSpan,
        getNodeCenterDistance(
          getCandidateColumn(node),
          getBlockColumnWidth(node.id, blockById),
          assignedColumnOrders.get(assignedNode.id) ?? getDataTopologyOrder(assignedNode),
          getBlockColumnWidth(assignedNode.id, blockById),
        ),
      );
    });
  });

  return {
    connectionCount,
    maxConnectionSpan,
  };
}

function getNodeCenterDistance(
  leftColumn: number,
  leftWidth: number,
  rightColumn: number,
  rightWidth: number,
) {
  const leftCenter = leftColumn + (leftWidth - 1) / 2;
  const rightCenter = rightColumn + (rightWidth - 1) / 2;

  return Math.abs(leftCenter - rightCenter);
}
