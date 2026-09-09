import type { ModuleBaseNode, ModuleNodeData } from '../ModuleBaseNodeTypes';

export interface HeightCollectionResult {
  nodeHeights: Map<string, number>;
  visitedNodes: ModuleNodeData[];
  valleyHeights: number[];
}

interface BackwardCollectionOptions {
  onlyAdjustRecursiveSourceConnections?: boolean;
}

interface BackwardIslandContext {
  candidateNodeIds: Set<string>;
  islandWidth: number;
  pathSuccessorsByNodeId: Map<string, ModuleNodeData[]>;
  sinkIds: Set<string>;
  sourceNodes: ModuleNodeData[];
}

export function getDataTopologyOrder(node: ModuleNodeData) {
  return node.forwardTopologyOrder ?? 0;
}

export function getDataBackwardTopologyOrder(node: ModuleNodeData) {
  return node.backwardTopologyOrder ?? 0;
}

export function buildArrangeReachabilityMaps(nodes: ModuleBaseNode[]): {
  sourceDescendantsMap: Map<string, Set<string>>;
  sinkAncestorsMap: Map<string, Set<string>>;
} {
  const sourceDescendantsMap = new Map<string, Set<string>>();
  const sinkAncestorsMap = new Map<string, Set<string>>();
  const descendantsByNodeId = new Map<string, Set<string>>();
  const ancestorsByNodeId = new Map<string, Set<string>>();

  nodes.forEach((node) => {
    const { data } = node;

    if (getDataTopologyOrder(data) === 0) {
      sourceDescendantsMap.set(
        data.id,
        collectReachableNodeIds(data, (current) => current.successors, descendantsByNodeId),
      );
    }

    if (getDataBackwardTopologyOrder(data) === 0) {
      sinkAncestorsMap.set(
        data.id,
        collectReachableNodeIds(data, (current) => current.predecessors, ancestorsByNodeId),
      );
    }
  });

  return {
    sourceDescendantsMap,
    sinkAncestorsMap,
  };
}

export function collectDescendantsWithoutPassingThroughBlocked(
  source: ModuleNodeData,
  blockedNodeIds: Set<string>,
): Set<string> {
  return collectReachableNodeIds(
    source,
    (node) => node.successors,
    undefined,
    blockedNodeIds,
  );
}

export function collectAncestorsWithoutPassingThroughBlocked(
  sink: ModuleNodeData,
  blockedNodeIds: Set<string>,
): Set<string> {
  return collectReachableNodeIds(
    sink,
    (node) => node.predecessors,
    undefined,
    blockedNodeIds,
  );
}

export function collectIslandBackwardFromSink(
  sinks: ModuleNodeData | ModuleNodeData[],
  candidateNodes: Set<string>,
  horizon: number,
  ridgeHeights: number[],
  getTopologyOrder = getDataTopologyOrder,
  getNodeColumnWidth: (node: ModuleNodeData) => number = () => 1,
  getNodeHeightUnits: (node: ModuleNodeData) => number = () => 2,
  options: BackwardCollectionOptions = {},
): HeightCollectionResult {
  const islandContext = buildBackwardIslandContext(
    sinks,
    candidateNodes,
  );
  const basePathNodeIds = findBranchiestSourceSinkPathNodeIds(islandContext);

  return collectIslandHeights({
    anchors: sinks,
    candidateNodes,
    horizon,
    ridgeHeights,
    getTopologyOrder,
    getNodeColumnWidth,
    getNodeHeightUnits,
    getLinkedNodes: (node) => node.predecessors,
    compareLinkedNodes: (left, right) => compareForwardArrangeNodes(
      left,
      right,
      basePathNodeIds,
      islandContext.islandWidth,
    ),
    writeSegment: ({
      nodeHeights,
      writeRidge,
      writeValley,
      currentNode,
      linkedNode,
      placedNodeIds,
    }) => {
      const from = getTopologyOrder(linkedNode);
      const fromEnd = from + getNodeColumnWidth(linkedNode) - 1;
      const connectionTargets = options.onlyAdjustRecursiveSourceConnections
        ? linkedNode.successors.filter((successor) => successor.id === currentNode.id)
        : linkedNode.successors.filter((successor) => (
          placedNodeIds.has(successor.id)
        ));
      const columnBaseHeight = getMaxRidgeHeight(ridgeHeights, from, fromEnd);
      const connectionBaseHeight = getMaxConnectionBaseHeight(
        connectionTargets.map((target) => ({
          start: fromEnd,
          end: getTopologyOrder(target),
        })),
        ridgeHeights,
      );
      const baseHeight = Math.max(
        columnBaseHeight,
        connectionBaseHeight,
        horizon,
      );

      nodeHeights.set(linkedNode.id, baseHeight);
      writeNodeRidge(
        writeRidge,
        from,
        fromEnd,
        baseHeight + getNodeHeightUnits(linkedNode),
      );
      writeNodeValley(writeValley, from, fromEnd, baseHeight);
      connectionTargets.forEach((target) => {
        writeMiddleProfile(
          writeRidge,
          writeValley,
          fromEnd,
          getTopologyOrder(target),
          baseHeight + 1,
        );
      });
    },
  });
}

interface SourceSinkPathScore {
  nodeId: string;
  nextNodeId?: string;
  branchCount: number;
  edgeCount: number;
}

function buildBackwardIslandContext(
  sinks: ModuleNodeData | ModuleNodeData[],
  candidateNodeIds: Set<string>,
) {
  const sinkList = toNodeList(sinks);
  const sinkIds = new Set(sinkList.map((sink) => sink.id));
  const nodeById = collectCandidateNodesFromSinks(sinkList, candidateNodeIds);

  return {
    candidateNodeIds,
    islandWidth: Math.max(
      0,
      ...[...nodeById.values()].map(getDataTopologyOrder),
    ),
    pathSuccessorsByNodeId: new Map<string, ModuleNodeData[]>(),
    sinkIds,
    sourceNodes: getCandidateSourceNodes(nodeById, candidateNodeIds),
  };
}

function findBranchiestSourceSinkPathNodeIds({
  sinkIds,
  sourceNodes,
  pathSuccessorsByNodeId,
  candidateNodeIds,
}: BackwardIslandContext) {
  const memo = new Map<string, SourceSinkPathScore | null>();
  const visiting = new Set<string>();

  function collectBestPath(node: ModuleNodeData): SourceSinkPathScore | null {
    if (sinkIds.has(node.id)) {
      const sinkPath = {
        nodeId: node.id,
        branchCount: 0,
        edgeCount: 0,
      };

      memo.set(node.id, sinkPath);
      return sinkPath;
    }
    if (visiting.has(node.id)) return null;

    if (memo.has(node.id)) return memo.get(node.id) ?? null;

    visiting.add(node.id);

    const successorPaths = getPathSuccessors(
      node,
      candidateNodeIds,
      sinkIds,
      pathSuccessorsByNodeId,
    )
      .map((successor) => collectBestPath(successor))
      .filter((path): path is SourceSinkPathScore => Boolean(path));
    const branchCount = Math.max(0, successorPaths.length - 1);
    const bestSuccessorPath = pickPreferredSourceSinkPath(successorPaths);

    const bestPath = bestSuccessorPath
      ? {
        nodeId: node.id,
        nextNodeId: bestSuccessorPath.nodeId,
        branchCount: branchCount + bestSuccessorPath.branchCount,
        edgeCount: bestSuccessorPath.edgeCount + 1,
      }
      : null;

    visiting.delete(node.id);
    memo.set(node.id, bestPath);
    return bestPath;
  }

  const bestPath = pickPreferredSourceSinkPath(
    sourceNodes
      .map((source) => collectBestPath(source))
      .filter((path): path is SourceSinkPathScore => Boolean(path)),
  );

  return traceSourceSinkPath(bestPath, memo);
}

function isSourceSinkPathPreferred(
  candidate: SourceSinkPathScore,
  current: SourceSinkPathScore,
) {
  if (candidate.edgeCount !== current.edgeCount) {
    return candidate.edgeCount < current.edgeCount;
  }

  return candidate.branchCount > current.branchCount;
}

function pickPreferredSourceSinkPath(paths: SourceSinkPathScore[]) {
  return paths.reduce<SourceSinkPathScore | null>(
    (bestPath, path) => (
      !bestPath || isSourceSinkPathPreferred(path, bestPath)
        ? path
        : bestPath
    ),
    null,
  );
}

function traceSourceSinkPath(
  path: SourceSinkPathScore | null,
  pathByNodeId: Map<string, SourceSinkPathScore | null>,
) {
  const nodeIds = new Set<string>();
  let currentPath = path;

  while (currentPath && !nodeIds.has(currentPath.nodeId)) {
    nodeIds.add(currentPath.nodeId);
    currentPath = currentPath.nextNodeId
      ? pathByNodeId.get(currentPath.nextNodeId) ?? null
      : null;
  }

  return nodeIds;
}

function getCandidateSourceNodes(
  nodeById: Map<string, ModuleNodeData>,
  candidateNodeIds: Set<string>,
) {
  return [...nodeById.values()]
    .filter((node) => (
      candidateNodeIds.has(node.id)
      && !node.predecessors.some((predecessor) => (
        candidateNodeIds.has(predecessor.id)
      ))
    ))
    .sort(compareTopologyThenId);
}

function getPathSuccessors(
  node: ModuleNodeData,
  candidateNodeIds: Set<string>,
  sinkIds: Set<string>,
  pathSuccessorsByNodeId: Map<string, ModuleNodeData[]>,
) {
  const cachedSuccessors = pathSuccessorsByNodeId.get(node.id);

  if (cachedSuccessors) return cachedSuccessors;

  const successors = node.successors
    .filter((successor) => (
      candidateNodeIds.has(successor.id)
      || sinkIds.has(successor.id)
    ))
    .sort(compareTopologyThenId);

  pathSuccessorsByNodeId.set(node.id, successors);
  return successors;
}

function compareTopologyThenId(left: ModuleNodeData, right: ModuleNodeData) {
  const topologyDifference = getDataTopologyOrder(left) - getDataTopologyOrder(right);

  if (topologyDifference !== 0) return topologyDifference;

  return left.id.localeCompare(right.id);
}

export function compareForwardArrangeNodes(
  left: ModuleNodeData,
  right: ModuleNodeData,
  basePathNodeIds: Set<string>,
  islandWidth: number,
) {
  const basePathDifference = Number(!basePathNodeIds.has(left.id))
    - Number(!basePathNodeIds.has(right.id));
  if (basePathDifference !== 0) return basePathDifference;

  const topologyBalanceDifference = getTopologyGap(left, islandWidth)
    - getTopologyGap(right, islandWidth);
  if (topologyBalanceDifference !== 0) return topologyBalanceDifference;

  return 0;
}

export function collectIslandForwardFromSource(
  sources: ModuleNodeData | ModuleNodeData[],
  candidateNodes: Set<string>,
  horizon: number,
  ridgeHeights: number[],
  getTopologyOrder = getDataTopologyOrder,
  getNodeColumnWidth: (node: ModuleNodeData) => number = () => 1,
  getNodeHeightUnits: (node: ModuleNodeData) => number = () => 2,
): HeightCollectionResult {
  return collectIslandHeights({
    anchors: sources,
    candidateNodes,
    horizon,
    ridgeHeights,
    getTopologyOrder,
    getNodeColumnWidth,
    getNodeHeightUnits,
    getLinkedNodes: (node) => node.successors,
    writeSegment: ({
      nodeHeights,
      writeRidge,
      writeValley,
      linkedNode,
      placedNodeIds,
    }) => {
      const to = getTopologyOrder(linkedNode);
      const toEnd = to + getNodeColumnWidth(linkedNode) - 1;
      const connectionSources = linkedNode.predecessors.filter((predecessor) => (
        placedNodeIds.has(predecessor.id)
      ));
      const columnBaseHeight = getMaxRidgeHeight(ridgeHeights, to, toEnd);
      const connectionBaseHeight = getMaxConnectionBaseHeight(
        connectionSources.map((source) => ({
          start: getTopologyOrder(source) + getNodeColumnWidth(source) - 1,
          end: to,
        })),
        ridgeHeights,
      );
      const baseHeight = Math.max(
        columnBaseHeight,
        connectionBaseHeight,
        horizon,
      );

      nodeHeights.set(linkedNode.id, baseHeight);
      writeNodeRidge(
        writeRidge,
        to,
        toEnd,
        baseHeight + getNodeHeightUnits(linkedNode),
      );
      writeNodeValley(writeValley, to, toEnd, baseHeight);
      connectionSources.forEach((source) => {
        writeMiddleProfile(
          writeRidge,
          writeValley,
          getTopologyOrder(source) + getNodeColumnWidth(source) - 1,
          to,
          baseHeight + 1,
        );
      });
    },
  });
}

function collectReachableNodeIds(
  root: ModuleNodeData,
  getLinkedNodes: (node: ModuleNodeData) => ModuleNodeData[],
  cache?: Map<string, Set<string>>,
  blockedNodeIds = new Set<string>(),
): Set<string> {
  const cachedNodeIds = blockedNodeIds.size === 0 ? cache?.get(root.id) : undefined;

  if (cachedNodeIds) return cachedNodeIds;

  const result = new Set<string>();
  const visitingNodeIds = new Set<string>();

  function visit(node: ModuleNodeData, isRoot = false) {
    if (visitingNodeIds.has(node.id)) return;
    if (!isRoot && blockedNodeIds.has(node.id)) return;

    visitingNodeIds.add(node.id);

    if (!blockedNodeIds.has(node.id)) {
      result.add(node.id);
    }

    getLinkedNodes(node).forEach((linkedNode) => {
      visit(linkedNode);
    });
  }

  visit(root, true);

  if (blockedNodeIds.size === 0) {
    cache?.set(root.id, result);
  }

  return result;
}

function collectCandidateNodesFromSinks(
  sinks: ModuleNodeData[],
  candidateNodeIds: Set<string>,
) {
  const nodeById = new Map<string, ModuleNodeData>();
  const queue = [...sinks];

  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index];
    if (nodeById.has(node.id)) continue;

    nodeById.set(node.id, node);
    node.predecessors.forEach((predecessor) => {
      if (candidateNodeIds.has(predecessor.id)) {
        queue.push(predecessor);
      }
    });
  }

  return nodeById;
}

function getTopologyGap(node: ModuleNodeData, islandWidth: number) {
  return islandWidth
    - getDataTopologyOrder(node)
    - getDataBackwardTopologyOrder(node);
}

interface IslandHeightOptions {
  anchors: ModuleNodeData | ModuleNodeData[];
  candidateNodes: Set<string>;
  horizon: number;
  ridgeHeights: number[];
  getTopologyOrder: (node: ModuleNodeData) => number;
  getNodeColumnWidth: (node: ModuleNodeData) => number;
  getNodeHeightUnits: (node: ModuleNodeData) => number;
  getLinkedNodes: (node: ModuleNodeData) => ModuleNodeData[];
  compareLinkedNodes?: (
    left: ModuleNodeData,
    right: ModuleNodeData,
  ) => number;
  writeSegment: (context: {
    nodeHeights: Map<string, number>;
    writeRidge: (index: number, value: number) => void;
    writeValley: (index: number, value: number) => void;
    currentNode: ModuleNodeData;
    linkedNode: ModuleNodeData;
    placedNodeIds: Set<string>;
  }) => void;
}

function collectIslandHeights({
  anchors,
  candidateNodes,
  horizon,
  ridgeHeights,
  getTopologyOrder,
  getNodeColumnWidth,
  getNodeHeightUnits,
  getLinkedNodes,
  compareLinkedNodes,
  writeSegment,
}: IslandHeightOptions): HeightCollectionResult {
  const nodeHeights = new Map<string, number>();
  const visitedNodes: ModuleNodeData[] = [];
  const valleyHeights: number[] = [];
  const expanded = new Set<string>();
  const anchorList = toNodeList(anchors);
  const placedNodeIds = new Set(anchorList.map((anchor) => anchor.id));

  function writeRidge(index: number, value: number) {
    while (ridgeHeights.length <= index) {
      ridgeHeights.push(0);
    }

    ridgeHeights[index] = Math.max(ridgeHeights[index], value);
  }

  function writeValley(index: number, value: number) {
    valleyHeights[index] = Math.min(valleyHeights[index] ?? Number.POSITIVE_INFINITY, value);
  }

  function visit(node: ModuleNodeData) {
    if (expanded.has(node.id)) return;

    expanded.add(node.id);

    if (candidateNodes.has(node.id)) {
      visitedNodes.push(node);
    }

    [...getLinkedNodes(node)]
      .sort(compareLinkedNodes ?? (
        (left, right) => getTopologyOrder(left) - getTopologyOrder(right)
      ))
      .forEach((linkedNode) => {
        if (!candidateNodes.has(linkedNode.id)) return;
        if (nodeHeights.has(linkedNode.id)) return;

        writeSegment({
          nodeHeights,
          writeRidge,
          writeValley,
          currentNode: node,
          linkedNode,
          placedNodeIds,
        });
        placedNodeIds.add(linkedNode.id);
        visit(linkedNode);
      });
  }

  anchorList.forEach((anchor) => {
    if (candidateNodes.has(anchor.id)) {
      const start = getTopologyOrder(anchor);
      const end = start + getNodeColumnWidth(anchor) - 1;
      const baseHeight = Math.max(
        getMaxRidgeHeight(ridgeHeights, start, end),
        horizon,
      );

      nodeHeights.set(anchor.id, baseHeight);
      writeNodeRidge(
        writeRidge,
        start,
        end,
        baseHeight + getNodeHeightUnits(anchor),
      );
      writeNodeValley(writeValley, start, end, baseHeight);
    }

    visit(anchor);
  });

  return {
    nodeHeights,
    visitedNodes,
    valleyHeights,
  };
}

function toNodeList(nodes: ModuleNodeData | ModuleNodeData[]) {
  return Array.isArray(nodes) ? nodes : [nodes];
}

function writeNodeRidge(
  writeRidge: (index: number, value: number) => void,
  start: number,
  end: number,
  value: number,
) {
  for (let index = start; index <= end; index += 1) {
    writeRidge(index, value);
  }
}

function writeNodeValley(
  writeValley: (index: number, value: number) => void,
  start: number,
  end: number,
  value: number,
) {
  for (let index = start; index <= end; index += 1) {
    writeValley(index, value);
  }
}

function writeMiddleProfile(
  writeRidge: (index: number, value: number) => void,
  writeValley: (index: number, value: number) => void,
  start: number,
  end: number,
  value: number,
) {
  for (let index = Math.min(start, end) + 1; index < Math.max(start, end); index += 1) {
    writeRidge(index, value);
    writeValley(index, value);
  }
}

function getMaxRidgeHeight(ridgeHeights: number[], start: number, end: number) {
  let height = 0;

  for (let index = start; index <= end; index += 1) {
    height = Math.max(height, ridgeHeights[index] ?? 0);
  }

  return height;
}

function getConnectionBaseHeight(
  ridgeHeights: number[],
  start: number,
  end: number,
) {
  const connectionRidgeHeight = getMaxRidgeHeight(
    ridgeHeights,
    Math.min(start, end) + 1,
    Math.max(start, end) - 1,
  );

  return Math.max(0, connectionRidgeHeight - 1);
}

function getMaxConnectionBaseHeight(
  connections: Array<{ start: number; end: number }>,
  ridgeHeights: number[],
) {
  return connections.reduce(
    (height, connection) => Math.max(
      height,
      getConnectionBaseHeight(
        ridgeHeights,
        connection.start,
        connection.end,
      ),
    ),
    0,
  );
}
