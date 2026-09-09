import type { ModuleBaseNode, ModuleNodeData } from '../ModuleBaseNodeTypes';
import {
  preprocessArrangeCycleBlocks,
  type ArrangeNodeBlock,
} from './arrangeCycleBlocks';
import {
  findLargestRemainingBranch,
  getBlockColumnWidth,
  getBranchColumnOrder,
  removeRootsCoveredByBranch,
  type CandidateBranch,
} from './arrangeBranchUtils';
import {
  buildArrangeReachabilityMaps,
  collectIslandBackwardFromSink,
  collectIslandForwardFromSource,
  getDataTopologyOrder,
  type HeightCollectionResult,
} from './arrangeNodesUtils';
import {
  getNodeHeight,
  mapModuleLayoutPosition,
} from './moduleLayoutPosition';

export {
  getNodeHeight,
  MODULE_LAYOUT_COLUMN_GAP,
  MODULE_LAYOUT_START_X,
  MODULE_LAYOUT_START_Y,
} from './moduleLayoutPosition';

interface LayoutState {
  nodeHeights: Map<string, number>;
  nodeColumnOrders: Map<string, number>;
  ridgeHeights: number[];
  visitedNodeIds: Set<string>;
}

export function arrangeModuleNodes(nodes: ModuleBaseNode[]) {
  if (nodes.length === 0) return [];

  const {
    layoutNodes,
    blockById,
    blockByMemberId,
  } = preprocessArrangeCycleBlocks(nodes);
  const layout = buildLayout(layoutNodes, blockById);
  const placements = nodes.map((node) => {
    const block = blockByMemberId.get(node.id)!;
    const memberIndex = block.members.findIndex((member) => member.id === node.id);
    const columnOffset = memberIndex % block.columnWidth;
    const rowOffset = Math.floor(memberIndex / block.columnWidth);
    const blockColumn = layout.nodeColumnOrders.get(block.id) ?? getTopologyOrder(block.node);

    return {
      node,
      columnOrder: blockColumn + columnOffset,
      blockLevel: layout.nodeHeights.get(block.id) ?? 0,
      rowOffset,
    };
  });
  // All columns must use the same vertical unit.  Using a separate unit per
  // column makes identical topology levels drift vertically when a CNN card
  // is taller than a ReLU or Sum card.
  const layoutUnitHeight = Math.max(
    ...placements.map(({ node }) => getNodeHeight(node)),
  );
  return placements.map(({ node, columnOrder, blockLevel, rowOffset }) => {
    const block = blockByMemberId.get(node.id)!;
    if (!layout.visitedNodeIds.has(block.id)) return node;

    const nodeHeight = getNodeHeight(node);
    const level = blockLevel + rowOffset * 2;
    const position = mapModuleLayoutPosition({
      columnOrder,
      level,
      nodeHeight,
      layoutUnitHeight,
    });

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

function buildLayout(
  nodes: ModuleBaseNode[],
  blockById: Map<string, ArrangeNodeBlock>,
): LayoutState {
  const layout: LayoutState = {
    nodeHeights: new Map(),
    nodeColumnOrders: new Map(),
    ridgeHeights: [],
    visitedNodeIds: new Set(),
  };

  collectConnectedNodeIslands(nodes, blockById).forEach((islandNodes, index) => {
    layoutIsland(islandNodes, layout, blockById, index === 0);
  });

  return layout;
}

function layoutIsland(
  nodes: ModuleBaseNode[],
  layout: LayoutState,
  blockById: Map<string, ArrangeNodeBlock>,
  isFirstIsland: boolean,
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node.data]));
  const maxForwardOrder = getMaxColumnOrder(nodes, blockById);
  const getNodeColumnWidth = (node: ModuleNodeData) => (
    blockById.get(node.id)?.columnWidth ?? 1
  );
  const getNodeHeightUnits = (node: ModuleNodeData) => (
    blockById.get(node.id)?.heightUnits ?? 2
  );
  const { sourceDescendantsMap, sinkAncestorsMap } = buildArrangeReachabilityMaps(nodes);
  const activeSourceIds = new Set(sourceDescendantsMap.keys());
  const activeSinkIds = new Set(sinkAncestorsMap.keys());
  const mainIsland = findLargestSourceSinkIntersection(
    sourceDescendantsMap,
    sinkAncestorsMap,
  );

  if (!mainIsland) return;

  const visitedNodeIds = new Set<string>();
  const initialHorizon = isFirstIsland
    ? 0
    : getMaxRidgeHeightInRange(layout.ridgeHeights, 0, maxForwardOrder) + 1;

  addHeightResult(
    layout,
    visitedNodeIds,
    collectIslandBackwardFromSink(
      nodeById.get(mainIsland.sinkId)!,
      mainIsland.nodeIds,
      initialHorizon,
      layout.ridgeHeights,
      getDataTopologyOrder,
      getNodeColumnWidth,
      getNodeHeightUnits,
      { onlyAdjustRecursiveSourceConnections: true },
    ),
    getDataTopologyOrder,
  );

  while (visitedNodeIds.size < nodes.length) {
    const branch = findLargestRemainingBranch({
      sourceIds: [...activeSourceIds],
      sinkIds: [...activeSinkIds],
      nodeById,
      blockedNodeIds: visitedNodeIds,
      assignedColumnOrders: layout.nodeColumnOrders,
      maxForwardOrder,
      blockById,
    });

    if (!branch) break;

    removeRootsCoveredByBranch(branch, activeSourceIds, activeSinkIds);

    const beforeCount = visitedNodeIds.size;
    const getColumnOrder = getBranchColumnOrder(
      branch.side,
      maxForwardOrder,
      blockById,
    );

    addHeightResult(
      layout,
      visitedNodeIds,
      collectBranchHeights(
        branch,
        visitedNodeIds,
        layout.nodeColumnOrders,
        nodeById,
        layout.ridgeHeights,
        maxForwardOrder,
        blockById,
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
  getColumnOrder: (node: ModuleNodeData) => number,
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
  assignedColumnOrders: Map<string, number>,
  nodeById: Map<string, ModuleNodeData>,
  ridgeHeights: number[],
  maxForwardOrder: number,
  blockById: Map<string, ArrangeNodeBlock>,
) {
  const assignedColumnEnds = buildAssignedColumnEndMap(
    assignedNodeIds,
    assignedColumnOrders,
    nodeById,
    blockById,
  );
  const assignedNodes = [...assignedNodeIds]
    .map((nodeId) => nodeById.get(nodeId)!)
    .sort((left, right) => compareBranchAnchors(
      left,
      right,
      branch,
      assignedColumnEnds,
    ));
  const getColumnOrder = getBranchColumnOrder(branch.side, maxForwardOrder, blockById);
  const getNodeColumnWidth = (node: ModuleNodeData) => (
    blockById.get(node.id)?.columnWidth ?? 1
  );
  const getNodeHeightUnits = (node: ModuleNodeData) => (
    blockById.get(node.id)?.heightUnits ?? 2
  );
  const branchRidgeHeights: number[] = [];
  const result = branch.side === 'sink'
    ? collectIslandForwardFromSource(
      assignedNodes,
      branch.nodeIds,
      0,
      branchRidgeHeights,
      getColumnOrder,
      getNodeColumnWidth,
      getNodeHeightUnits,
    )
    : collectIslandBackwardFromSink(
      assignedNodes,
      branch.nodeIds,
      0,
      branchRidgeHeights,
      getColumnOrder,
      getNodeColumnWidth,
      getNodeHeightUnits,
    );
  const offset = getProfileOffset(ridgeHeights, result.valleyHeights);

  result.nodeHeights.forEach((height, nodeId) => {
    result.nodeHeights.set(nodeId, height + offset);
  });
  branchRidgeHeights.forEach((height, index) => {
    ridgeHeights[index] = Math.max(ridgeHeights[index] ?? 0, height + offset);
  });

  return result;
}

function compareBranchAnchors(
  left: ModuleNodeData,
  right: ModuleNodeData,
  branch: CandidateBranch,
  assignedColumnEnds: Map<string, number>,
) {
  const leftColumn = assignedColumnEnds.get(left.id) ?? getDataTopologyOrder(left);
  const rightColumn = assignedColumnEnds.get(right.id) ?? getDataTopologyOrder(right);
  const columnDifference = branch.side === 'sink'
    ? rightColumn - leftColumn
    : leftColumn - rightColumn;

  if (columnDifference !== 0) return columnDifference;

  return left.id.localeCompare(right.id);
}

function buildAssignedColumnEndMap(
  assignedNodeIds: Set<string>,
  assignedColumnOrders: Map<string, number>,
  nodeById: Map<string, ModuleNodeData>,
  blockById: Map<string, ArrangeNodeBlock>,
) {
  const columnEnds = new Map<string, number>();

  assignedNodeIds.forEach((nodeId) => {
    const node = nodeById.get(nodeId);
    const columnOrder = assignedColumnOrders.get(nodeId)
      ?? (node ? getDataTopologyOrder(node) : undefined);

    if (columnOrder === undefined) return;
    columnEnds.set(
      nodeId,
      columnOrder + (blockById.get(nodeId)?.columnWidth ?? 1) - 1,
    );
  });

  return columnEnds;
}

function getProfileOffset(
  ridgeHeights: number[],
  valleyHeights: number[],
) {
  let offset = 0;

  valleyHeights.forEach((valleyHeight, index) => {
    if (!Number.isFinite(valleyHeight)) return;

    offset = Math.max(offset, (ridgeHeights[index] ?? 0) - valleyHeight);
  });

  return offset;
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

function collectConnectedNodeIslands(
  nodes: ModuleBaseNode[],
  blockById: Map<string, ArrangeNodeBlock>,
) {
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

  return islands.sort((left, right) => (
    getIslandNodeCount(right, blockById) - getIslandNodeCount(left, blockById)
  ));
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

function getMaxColumnOrder(
  nodes: ModuleBaseNode[],
  blockById: Map<string, ArrangeNodeBlock>,
) {
  return Math.max(0, ...nodes.map((node) => (
    getTopologyOrder(node) + getBlockColumnWidth(node.id, blockById) - 1
  )));
}

function getIslandNodeCount(
  nodes: ModuleBaseNode[],
  blockById: Map<string, ArrangeNodeBlock>,
) {
  return nodes.reduce(
    (count, node) => count + (blockById.get(node.id)?.members.length ?? 1),
    0,
  );
}

function getTopologyOrder(node: ModuleBaseNode) {
  return node.data.forwardTopologyOrder ?? 0;
}
