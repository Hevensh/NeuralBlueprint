import type { ModuleBaseNode, ModuleBaseNodeData } from '../ModuleBaseNodeTypes';
import {
  buildArrangeReachabilityMaps,
  collectAncestorsWithoutPassingThroughBlocked,
  collectDescendantsWithoutPassingThroughBlocked,
  collectIslandBackwardFromSink,
  collectIslandForwardFromSource,
  getDataBackwardTopologyOrder,
  getDataTopologyOrder,
  type HeightCollectionResult,
} from './arrangeNodesUtils';

const COLUMN_GAP = 240;
const START_X = 120;
const START_Y = 180;
const DEFAULT_NODE_HEIGHT = 72;

type BranchSide = 'source' | 'sink';

interface CandidateBranch {
  side: BranchSide;
  nodeIds: Set<string>;
}

interface LayoutState {
  nodeHeights: Map<string, number>;
  nodeColumnOrders: Map<string, number>;
  ridgeHeights: number[];
  visitedNodeIds: Set<string>;
}

export function arrangeModuleNodes(nodes: ModuleBaseNode[]) {
  if (nodes.length === 0) return [];

  const layout = buildLayout(nodes);

  return nodes.map((node) => {
    if (!layout.visitedNodeIds.has(node.id)) return node;

    const columnOrder = layout.nodeColumnOrders.get(node.id) ?? getTopologyOrder(node);
    const level = layout.nodeHeights.get(node.id) ?? layout.ridgeHeights[columnOrder] ?? 0;
    const position = {
      x: START_X + columnOrder * COLUMN_GAP,
      y: START_Y + level * getNodeHeight(node) / 2,
    };

    return {
      ...node,
      position,
      data: {
        ...node.data,
        position,
      },
    };
  });
}

function buildLayout(nodes: ModuleBaseNode[]): LayoutState {
  const layout: LayoutState = {
    nodeHeights: new Map(),
    nodeColumnOrders: new Map(),
    ridgeHeights: [],
    visitedNodeIds: new Set(),
  };

  collectConnectedNodeIslands(nodes).forEach((islandNodes, index) => {
    layoutIsland(islandNodes, layout, index === 0);
  });

  return layout;
}

function layoutIsland(
  nodes: ModuleBaseNode[],
  layout: LayoutState,
  isFirstIsland: boolean,
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node.data]));
  const maxForwardOrder = getMaxForwardOrder(nodes);
  const { sourceDescendantsMap, sinkAncestorsMap } = buildArrangeReachabilityMaps(nodes);
  const mainIsland = findLargestSourceSinkIntersection(
    sourceDescendantsMap,
    sinkAncestorsMap,
  );

  if (!mainIsland) return;

  const visitedNodeIds = new Set<string>();
  const initialHorizon = isFirstIsland
    ? 0
    : getMaxRidgeHeightInRange(layout.ridgeHeights, 0, maxForwardOrder) + 2;

  addHeightResult(
    layout,
    visitedNodeIds,
    collectIslandBackwardFromSink(
      nodeById.get(mainIsland.sinkId)!,
      mainIsland.nodeIds,
      initialHorizon,
      layout.ridgeHeights,
    ),
    getDataTopologyOrder,
  );

  while (visitedNodeIds.size < nodes.length) {
    const branch = findLargestRemainingBranch({
      sourceIds: [...sourceDescendantsMap.keys()],
      sinkIds: [...sinkAncestorsMap.keys()],
      nodeById,
      blockedNodeIds: visitedNodeIds,
    });

    if (!branch) break;

    const beforeCount = visitedNodeIds.size;
    const getColumnOrder = getBranchColumnOrder(branch.side, maxForwardOrder);

    addHeightResult(
      layout,
      visitedNodeIds,
      collectBranchHeights(
        branch,
        visitedNodeIds,
        nodeById,
        layout.ridgeHeights,
        maxForwardOrder,
      ),
      getColumnOrder,
    );

    if (visitedNodeIds.size === beforeCount) break;
  }
}

function addHeightResult(
  layout: LayoutState,
  componentVisitedNodeIds: Set<string>,
  result: HeightCollectionResult,
  getColumnOrder: (node: ModuleBaseNodeData) => number,
) {
  result.nodeHeights.forEach((height, nodeId) => {
    layout.nodeHeights.set(nodeId, height);
  });

  result.visitedNodes.forEach((node) => {
    layout.visitedNodeIds.add(node.id);
    componentVisitedNodeIds.add(node.id);
    layout.nodeColumnOrders.set(node.id, getColumnOrder(node));
  });
}

function collectBranchHeights(
  branch: CandidateBranch,
  assignedNodeIds: Set<string>,
  nodeById: Map<string, ModuleBaseNodeData>,
  ridgeHeights: number[],
  maxForwardOrder: number,
) {
  const assignedNodes = [...assignedNodeIds].map((nodeId) => nodeById.get(nodeId)!);
  const horizon = getBranchHorizon(branch, nodeById, ridgeHeights, maxForwardOrder);
  const getColumnOrder = getBranchColumnOrder(branch.side, maxForwardOrder);

  return branch.side === 'sink'
    ? collectIslandForwardFromSource(
      assignedNodes,
      branch.nodeIds,
      horizon,
      ridgeHeights,
      getColumnOrder,
    )
    : collectIslandBackwardFromSink(
      assignedNodes,
      branch.nodeIds,
      horizon,
      ridgeHeights,
      getColumnOrder,
    );
}

function getBranchHorizon(
  branch: CandidateBranch,
  nodeById: Map<string, ModuleBaseNodeData>,
  ridgeHeights: number[],
  maxForwardOrder: number,
) {
  const branchNodes = [...branch.nodeIds].map((nodeId) => nodeById.get(nodeId)!);

  if (branch.side === 'sink') {
    const maxBackwardOrder = Math.max(...branchNodes.map(getDataBackwardTopologyOrder));

    return getMaxRidgeHeightInRange(
      ridgeHeights,
      maxForwardOrder - maxBackwardOrder,
      maxForwardOrder,
    );
  }

  const maxBranchForwardOrder = Math.max(...branchNodes.map(getDataTopologyOrder));

  return getMaxRidgeHeightInRange(ridgeHeights, 0, maxBranchForwardOrder);
}

function findLargestRemainingBranch({
  sourceIds,
  sinkIds,
  nodeById,
  blockedNodeIds,
}: {
  sourceIds: string[];
  sinkIds: string[];
  nodeById: Map<string, ModuleBaseNodeData>;
  blockedNodeIds: Set<string>;
}): CandidateBranch | null {
  let largestBranch: CandidateBranch | null = null;

  const acceptBranch = (side: BranchSide, nodeIds: Set<string>) => {
    if (nodeIds.size === 0) return;
    if (!largestBranch || nodeIds.size > largestBranch.nodeIds.size) {
      largestBranch = { side, nodeIds };
    }
  };

  sourceIds.forEach((sourceId) => {
    acceptBranch(
      'source',
      collectDescendantsWithoutPassingThroughBlocked(
        nodeById.get(sourceId)!,
        blockedNodeIds,
      ),
    );
  });

  sinkIds.forEach((sinkId) => {
    acceptBranch(
      'sink',
      collectAncestorsWithoutPassingThroughBlocked(
        nodeById.get(sinkId)!,
        blockedNodeIds,
      ),
    );
  });

  return largestBranch;
}

function findLargestSourceSinkIntersection(
  sourceDescendantsMap: Map<string, Set<string>>,
  sinkAncestorsMap: Map<string, Set<string>>,
) {
  let largestIntersection: {
    sinkId: string;
    sourceDescendants: Set<string>;
    sinkAncestors: Set<string>;
    size: number;
  } | null = null;

  for (const sourceDescendants of sourceDescendantsMap.values()) {
    for (const [sinkId, sinkAncestors] of sinkAncestorsMap) {
      const size = countIntersection(sourceDescendants, sinkAncestors);

      if (size > 0 && (!largestIntersection || size > largestIntersection.size)) {
        largestIntersection = { sinkId, sourceDescendants, sinkAncestors, size };
      }
    }
  }

  return largestIntersection
    ? {
      sinkId: largestIntersection.sinkId,
      nodeIds: intersectNodeIds(
        largestIntersection.sourceDescendants,
        largestIntersection.sinkAncestors,
      ),
    }
    : null;
}

function collectConnectedNodeIslands(nodes: ModuleBaseNode[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const visitedNodeIds = new Set<string>();
  const islands: ModuleBaseNode[][] = [];

  nodes.forEach((node) => {
    if (visitedNodeIds.has(node.id)) return;

    const island: ModuleBaseNode[] = [];
    const queue = [node];

    for (let index = 0; index < queue.length; index += 1) {
      const currentNode = queue[index];
      if (visitedNodeIds.has(currentNode.id)) continue;

      visitedNodeIds.add(currentNode.id);
      island.push(currentNode);

      [...currentNode.data.predecessors, ...currentNode.data.successors].forEach((linkedNodeData) => {
        const linkedNode = nodeById.get(linkedNodeData.id);

        if (linkedNode && !visitedNodeIds.has(linkedNode.id)) {
          queue.push(linkedNode);
        }
      });
    }

    islands.push(island);
  });

  return islands.sort((left, right) => right.length - left.length);
}

function intersectNodeIds(left: Set<string>, right: Set<string>) {
  const result = new Set<string>();
  const smallerSet = left.size <= right.size ? left : right;
  const largerSet = left.size <= right.size ? right : left;

  smallerSet.forEach((nodeId) => {
    if (largerSet.has(nodeId)) result.add(nodeId);
  });

  return result;
}

function countIntersection(left: Set<string>, right: Set<string>) {
  let count = 0;
  const smallerSet = left.size <= right.size ? left : right;
  const largerSet = left.size <= right.size ? right : left;

  smallerSet.forEach((nodeId) => {
    if (largerSet.has(nodeId)) count += 1;
  });

  return count;
}

function getMaxRidgeHeightInRange(ridgeHeights: number[], start: number, end: number) {
  let horizon = 0;

  for (let index = Math.max(0, start); index <= end; index += 1) {
    horizon = Math.max(horizon, ridgeHeights[index] ?? 0);
  }

  return horizon;
}

function getBranchColumnOrder(side: BranchSide, maxForwardOrder: number) {
  return side === 'sink'
    ? (node: ModuleBaseNodeData) => maxForwardOrder - getDataBackwardTopologyOrder(node)
    : getDataTopologyOrder;
}

function getMaxForwardOrder(nodes: ModuleBaseNode[]) {
  return Math.max(0, ...nodes.map((node) => getTopologyOrder(node)));
}

function getTopologyOrder(node: ModuleBaseNode) {
  return node.data.forwardTopologyOrder ?? 0;
}

function getNodeHeight(node: ModuleBaseNode) {
  return (node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT) + 32;
}
