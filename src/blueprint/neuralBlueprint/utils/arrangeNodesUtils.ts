import type { ModuleBaseNode, ModuleBaseNodeData } from '../ModuleBaseNodeTypes';

export interface HeightCollectionResult {
  nodeHeights: Map<string, number>;
  visitedNodes: ModuleBaseNodeData[];
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
): HeightCollectionResult {
  return collectIslandHeights({
    anchors: sinks,
    candidateNodes,
    horizon,
    ridgeHeights,
    getTopologyOrder,
    getLinkedNodes: (node) => node.predecessors,
    writeSegment: ({ nodeHeights, writeRidge, currentNode, linkedNode }) => {
      const from = getTopologyOrder(linkedNode);
      const to = getTopologyOrder(currentNode);
      const baseHeight = Math.max(ridgeHeights[from] ?? 0, horizon);

      nodeHeights.set(linkedNode.id, baseHeight);
      writeRidge(from, baseHeight + 2);
      writeMiddleRidge(ridgeHeights, writeRidge, from, to, baseHeight + 1);
    },
  });
}

export function collectIslandForwardFromSource(
  sources: ModuleBaseNodeData | ModuleBaseNodeData[],
  candidateNodes: Set<string>,
  horizon: number,
  ridgeHeights: number[],
  getTopologyOrder = getDataTopologyOrder,
): HeightCollectionResult {
  return collectIslandHeights({
    anchors: sources,
    candidateNodes,
    horizon,
    ridgeHeights,
    getTopologyOrder,
    getLinkedNodes: (node) => node.successors,
    writeSegment: ({ nodeHeights, writeRidge, currentNode, linkedNode }) => {
      const from = getTopologyOrder(currentNode);
      const to = getTopologyOrder(linkedNode);
      const baseHeight = Math.max(ridgeHeights[to] ?? 0, horizon);

      nodeHeights.set(linkedNode.id, baseHeight);
      writeRidge(to, baseHeight + 2);
      writeMiddleRidge(ridgeHeights, writeRidge, from, to, baseHeight + 1);
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
  getLinkedNodes: (node: ModuleBaseNodeData) => ModuleBaseNodeData[];
  writeSegment: (context: {
    nodeHeights: Map<string, number>;
    writeRidge: (index: number, value: number) => void;
    currentNode: ModuleBaseNodeData;
    linkedNode: ModuleBaseNodeData;
  }) => void;
}

function collectIslandHeights({
  anchors,
  candidateNodes,
  horizon,
  ridgeHeights,
  getTopologyOrder,
  getLinkedNodes,
  writeSegment,
}: IslandHeightOptions): HeightCollectionResult {
  const nodeHeights = new Map<string, number>();
  const visitedNodes: ModuleBaseNodeData[] = [];
  const expanded = new Set<string>();

  function writeRidge(index: number, value: number) {
    while (ridgeHeights.length <= index) {
      ridgeHeights.push(0);
    }

    ridgeHeights[index] = Math.max(ridgeHeights[index], value);
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
          currentNode: node,
          linkedNode,
        });
        visit(linkedNode);
      });
  }

  (Array.isArray(anchors) ? anchors : [anchors]).forEach((anchor) => {
    if (candidateNodes.has(anchor.id)) {
      nodeHeights.set(anchor.id, horizon);
      writeRidge(getTopologyOrder(anchor), horizon + 2);
    }

    visit(anchor);
  });

  return {
    nodeHeights,
    visitedNodes,
  };
}

function writeMiddleRidge(
  ridgeHeights: number[],
  writeRidge: (index: number, value: number) => void,
  start: number,
  end: number,
  value: number,
) {
  for (let index = Math.min(start, end) + 1; index < Math.max(start, end); index += 1) {
    writeRidge(index, Math.max(ridgeHeights[index] ?? 0, value));
  }
}
