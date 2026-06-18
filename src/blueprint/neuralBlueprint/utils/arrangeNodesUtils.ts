import type { ModuleBaseNode, ModuleBaseNodeData } from '../ModuleBaseNodeTypes';

export interface HeightCollectionResult {
  nodeHeights: Map<string, number>;
  visitedNodes: ModuleBaseNodeData[];
  valleyHeights: number[];
}

export function getDataTopologyOrder(node: ModuleBaseNodeData) {
  return node.forwardTopologyOrder ?? 0;
}

export function getDataBackwardTopologyOrder(node: ModuleBaseNodeData) {
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
  source: ModuleBaseNodeData,
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
  sink: ModuleBaseNodeData,
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
  sinks: ModuleBaseNodeData | ModuleBaseNodeData[],
  candidateNodes: Set<string>,
  horizon: number,
  ridgeHeights: number[],
  getTopologyOrder = getDataTopologyOrder,
  getNodeColumnWidth: (node: ModuleBaseNodeData) => number = () => 1,
  getNodeHeightUnits: (node: ModuleBaseNodeData) => number = () => 2,
): HeightCollectionResult {
  return collectIslandHeights({
    anchors: sinks,
    candidateNodes,
    horizon,
    ridgeHeights,
    getTopologyOrder,
    getNodeColumnWidth,
    getNodeHeightUnits,
    getLinkedNodes: (node) => node.predecessors,
    writeSegment: ({
      nodeHeights,
      writeRidge,
      writeValley,
      linkedNode,
      placedNodeIds,
    }) => {
      const from = getTopologyOrder(linkedNode);
      const fromEnd = from + getNodeColumnWidth(linkedNode) - 1;
      const connectionTargets = linkedNode.successors.filter((successor) => (
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

export function collectIslandForwardFromSource(
  sources: ModuleBaseNodeData | ModuleBaseNodeData[],
  candidateNodes: Set<string>,
  horizon: number,
  ridgeHeights: number[],
  getTopologyOrder = getDataTopologyOrder,
  getNodeColumnWidth: (node: ModuleBaseNodeData) => number = () => 1,
  getNodeHeightUnits: (node: ModuleBaseNodeData) => number = () => 2,
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
  root: ModuleBaseNodeData,
  getLinkedNodes: (node: ModuleBaseNodeData) => ModuleBaseNodeData[],
  cache?: Map<string, Set<string>>,
  blockedNodeIds = new Set<string>(),
): Set<string> {
  const cachedNodeIds = blockedNodeIds.size === 0 ? cache?.get(root.id) : undefined;

  if (cachedNodeIds) return cachedNodeIds;

  const result = new Set<string>();
  const visitingNodeIds = new Set<string>();

  function visit(node: ModuleBaseNodeData, isRoot = false) {
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

interface IslandHeightOptions {
  anchors: ModuleBaseNodeData | ModuleBaseNodeData[];
  candidateNodes: Set<string>;
  horizon: number;
  ridgeHeights: number[];
  getTopologyOrder: (node: ModuleBaseNodeData) => number;
  getNodeColumnWidth: (node: ModuleBaseNodeData) => number;
  getNodeHeightUnits: (node: ModuleBaseNodeData) => number;
  getLinkedNodes: (node: ModuleBaseNodeData) => ModuleBaseNodeData[];
  writeSegment: (context: {
    nodeHeights: Map<string, number>;
    writeRidge: (index: number, value: number) => void;
    writeValley: (index: number, value: number) => void;
    currentNode: ModuleBaseNodeData;
    linkedNode: ModuleBaseNodeData;
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
  writeSegment,
}: IslandHeightOptions): HeightCollectionResult {
  const nodeHeights = new Map<string, number>();
  const visitedNodes: ModuleBaseNodeData[] = [];
  const valleyHeights: number[] = [];
  const expanded = new Set<string>();
  const anchorList = Array.isArray(anchors) ? anchors : [anchors];
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

  function visit(node: ModuleBaseNodeData) {
    if (expanded.has(node.id)) return;

    expanded.add(node.id);

    if (candidateNodes.has(node.id)) {
      visitedNodes.push(node);
    }

    [...getLinkedNodes(node)]
      .sort((left, right) => getTopologyOrder(left) - getTopologyOrder(right))
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
