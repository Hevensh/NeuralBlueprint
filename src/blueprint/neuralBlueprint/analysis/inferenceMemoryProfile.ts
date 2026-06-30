import type {
  LinearNodeData,
  ModuleBaseNode,
  ModuleNodeData,
} from '../ModuleBaseNodeTypes';
import type {
  InferenceMemoryGroup,
  InferenceMemoryModel,
  InferenceMemoryProfile,
  InferenceMemoryStageSegment,
} from '../../InferenceMemoryProfileTypes';
import { buildArrangeReachabilityMaps } from '../utils/arrangeNodesUtils';

export type {
  InferenceMemoryAggregationPair,
  InferenceMemoryGroup,
  InferenceMemoryModel,
  InferenceMemoryNodeWeight,
  InferenceMemoryProfile,
  InferenceMemoryStage,
  InferenceMemoryStageSegment,
} from '../../InferenceMemoryProfileTypes';

export function buildInferenceMemoryModels(
  nodes: ModuleBaseNode[],
): InferenceMemoryModel[] {
  return collectInferenceModelIslands(nodes).map((island, index) => ({
    id: `model_${index + 1}`,
    label: `Model ${index + 1}`,
    nodeIds: island.nodes.map((node) => node.id),
    sourceNodeIds: island.sourceNodeIds,
    sinkNodeIds: island.sinkNodeIds,
    profile: buildInferenceMemoryProfile(island.nodes),
  }));
}

export function collectInferenceModelIslands(
  nodes: ModuleBaseNode[],
): InferenceModelIsland[] {
  return collectConnectedNodeIslands(nodes)
    .map(collectSourceSinkIntersection)
    .filter((island) => island.nodes.length > 0);
}

export function buildInferenceMemoryProfile(
  nodes: ModuleBaseNode[],
): InferenceMemoryProfile {
  const nodeData = nodes.map((node) => node.data);
  const groupById = new Map<string, {
    inferenceStages: number[];
    nodes: LinearNodeData[];
  }>();

  nodes.forEach(({ data }) => {
    if (
      data.kind !== 'Linear'
      || !data.inferenceTopologyOrder?.size
      || !Number.isFinite(data.memoryPoint)
      || (data.memoryPoint as number) <= 0
    ) return;

    const inferenceStages = [...data.inferenceTopologyOrder].sort(
      (left, right) => left - right,
    );
    const id = inferenceStages.join(',');
    const group = groupById.get(id);

    if (group) {
      group.nodes.push(data);
      return;
    }

    groupById.set(id, {
      inferenceStages,
      nodes: [data],
    });
  });

  const baseGroups = [...groupById.entries()]
    .map(([id, group]) => {
      const stats = computeInferenceGroupProfile(group.nodes, nodeData);
      return {
        id,
        nodeIds: group.nodes.map((node) => node.id),
        inferenceStages: group.inferenceStages,
        memoryPoint: Math.floor(stats.memoryPoint),
        varianceRatio: stats.varianceRatio,
        nodeWeights: stats.nodeWeights,
        aggregationPairs: stats.aggregationPairs,
      };
    })
    .filter((group) => group.memoryPoint > 0)
    .sort(compareInferenceGroups);
  const totalMemoryPoint = baseGroups.reduce(
    (sum, group) => sum + group.memoryPoint,
    0,
  );
  const groups = baseGroups.map((group) => ({
    ...group,
    ratio: getRatio(group.memoryPoint, totalMemoryPoint),
  }));
  const stageSegments = new Map<number, InferenceMemoryStageSegment[]>();

  groups.forEach((group) => {
    const allocatedMemoryPoint = group.memoryPoint / group.inferenceStages.length;

    group.inferenceStages.forEach((stage) => {
      const segments = stageSegments.get(stage) ?? [];
      segments.push({
        groupId: group.id,
        memoryPoint: allocatedMemoryPoint,
        ratio: getRatio(allocatedMemoryPoint, totalMemoryPoint),
      });
      stageSegments.set(stage, segments);
    });
  });

  const stages = [...stageSegments.entries()]
    .sort(([left], [right]) => left - right)
    .map(([stage, segments]) => {
      const memoryPoint = segments.reduce(
        (sum, segment) => sum + segment.memoryPoint,
        0,
      );

      return {
        stage,
        memoryPoint,
        ratio: getRatio(memoryPoint, totalMemoryPoint),
        segments,
      };
    });

  return {
    networkSignature: createNetworkSignature(nodes),
    totalMemoryPoint,
    groups,
    stages,
  };
}

function createNetworkSignature(nodes: ModuleBaseNode[]) {
  return nodes
    .map(({ data }) => nodeSignature(data))
    .sort()
    .join('|');
}

function nodeSignature(data: ModuleNodeData) {
  return [
    data.id,
    data.kind,
    linkedNodeIds(data.predecessors),
    linkedNodeIds(data.successors),
    data.memoryPoint ?? '',
    data.inferencePoint ?? '',
    ...nodeConfigSignature(data),
  ].join(':');
}

function linkedNodeIds(nodes: ModuleNodeData[]) {
  return nodes.map((node) => node.id).sort().join(',');
}

function nodeConfigSignature(data: ModuleNodeData) {
  switch (data.kind) {
    case 'Input':
      return [data.outFeatures, data.inputEffectiveRank, data.normalizationMode];
    case 'Linear':
      return [
        data.inFeatures ?? '',
        data.outFeatures,
        data.useBias ? 1 : 0,
        data.initializationMode,
        data.biasInitializationMode,
      ];
    case 'Dropout':
      return [data.dropoutRate];
    case 'Output':
      return [data.neededOutputDim];
    default:
      return [];
  }
}

function compareInferenceGroups(
  left: Pick<InferenceMemoryGroup, 'inferenceStages'>,
  right: Pick<InferenceMemoryGroup, 'inferenceStages'>,
) {
  const length = Math.min(
    left.inferenceStages.length,
    right.inferenceStages.length,
  );

  for (let index = 0; index < length; index += 1) {
    const difference = left.inferenceStages[index] - right.inferenceStages[index];
    if (difference !== 0) return difference;
  }

  return left.inferenceStages.length - right.inferenceStages.length;
}

function getRatio(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

export function computeInferenceGroupProfile(
  nodes: LinearNodeData[],
  allNodes: ModuleNodeData[],
) {
  const aggregation = computeGroupAggregation(nodes, allNodes);
  const weighted = nodes.reduce(
    (state, node) => {
      const memoryPoint = isFiniteNumber(node.memoryPoint)
        ? node.memoryPoint
        : 0;
      const weight = aggregation.weights.get(node.id)?.weight ?? 1;
      return {
        memoryPoint: state.memoryPoint + memoryPoint * weight,
        forwardVariance: state.forwardVariance
          + finitePositive(node.stats?.variance) * weight,
        backwardVariance: state.backwardVariance
          + finitePositive(node.statsBackward?.variance) * weight,
      };
    },
    {
      memoryPoint: 0,
      forwardVariance: 0,
      backwardVariance: 0,
    },
  );
  const varianceRatio = weighted.backwardVariance > 0
    ? weighted.forwardVariance / weighted.backwardVariance
    : 1;
  return {
    memoryPoint: weighted.memoryPoint,
    varianceRatio,
    nodeWeights: [...aggregation.weights.values()],
    aggregationPairs: aggregation.pairs,
  };
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

      [
        ...currentNode.data.predecessors,
        ...currentNode.data.successors,
      ].forEach((linkedNode) => {
        const nodeInGraph = nodeById.get(linkedNode.id);
        if (nodeInGraph && !visitedNodeIds.has(nodeInGraph.id)) {
          queue.push(nodeInGraph);
        }
      });
    }

    islands.push(island);
  });

  return islands.sort((left, right) => right.length - left.length);
}

interface InferenceModelIsland {
  nodes: ModuleBaseNode[];
  sourceNodeIds: string[];
  sinkNodeIds: string[];
}

function collectSourceSinkIntersection(nodes: ModuleBaseNode[]): InferenceModelIsland {
  const { sourceDescendantsMap, sinkAncestorsMap } =
    buildArrangeReachabilityMaps(nodes);

  if (sourceDescendantsMap.size === 0 || sinkAncestorsMap.size === 0) {
    return {
      nodes: [],
      sourceNodeIds: [],
      sinkNodeIds: [],
    };
  }

  const participatingNodeIds = intersectSets(
    unionSets(sourceDescendantsMap.values()),
    unionSets(sinkAncestorsMap.values()),
  );

  return {
    nodes: nodes.filter((node) => participatingNodeIds.has(node.id)),
    sourceNodeIds: keysInSet(sourceDescendantsMap, participatingNodeIds),
    sinkNodeIds: keysInSet(sinkAncestorsMap, participatingNodeIds),
  };
}

function keysInSet(
  map: ReadonlyMap<string, unknown>,
  set: Set<string>,
) {
  return [...map.keys()].filter((key) => set.has(key));
}

function unionSets(sets: Iterable<Set<string>>) {
  const result = new Set<string>();

  for (const set of sets) {
    set.forEach((value) => result.add(value));
  }

  return result;
}

function intersectSets(left: Set<string>, right: Set<string>) {
  const result = new Set<string>();
  const smallerSet = left.size <= right.size ? left : right;
  const largerSet = left.size <= right.size ? right : left;

  smallerSet.forEach((value) => {
    if (largerSet.has(value)) result.add(value);
  });

  return result;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function finitePositive(value: unknown) {
  return isFiniteNumber(value) ? Math.max(0, value) : 0;
}

function computeGroupAggregation(
  nodes: LinearNodeData[],
  allNodes: ModuleNodeData[],
) {
  const groupNodeIds = new Set(nodes.map((node) => node.id));
  const linkedNodeIds = new Map(
    nodes.map((node) => [node.id, new Set<string>()]),
  );

  const link = (leftId: string, rightId: string) => {
    if (leftId === rightId) return;
    linkedNodeIds.get(leftId)?.add(rightId);
    linkedNodeIds.get(rightId)?.add(leftId);
  };

  nodes.forEach((node) => {
    [...node.predecessors, ...node.successors].forEach((linkedNode) => {
      if (groupNodeIds.has(linkedNode.id)) {
        link(node.id, linkedNode.id);
      }
    });
  });

  allNodes.forEach((node) => {
    const directGroupInputs = node.predecessors
      .map((predecessor) => predecessor.id)
      .filter((nodeId) => groupNodeIds.has(nodeId));

    for (let left = 0; left < directGroupInputs.length; left += 1) {
      for (
        let right = left + 1;
        right < directGroupInputs.length;
        right += 1
      ) {
        link(directGroupInputs[left], directGroupInputs[right]);
      }
    }
  });

  const componentByNodeId = new Map<string, Set<string>>();

  nodes.forEach((node) => {
    componentByNodeId.set(
      node.id,
      collectConnectedGroup(node.id, linkedNodeIds),
    );
  });

  const weights = new Map(
    nodes.map((node) => {
      const rhoCount = (componentByNodeId.get(node.id)?.size ?? 1) - 1;
      return [
        node.id,
        {
          nodeId: node.id,
          rhoCount,
          weight: 1 / (1 + rhoCount),
        },
      ];
    }),
  );
  const pairs = [];

  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      const leftNode = nodes[left];
      const rightNode = nodes[right];
      const rho = componentByNodeId.get(leftNode.id)?.has(rightNode.id)
        ? 1
        : 0;
      pairs.push({
        leftNodeId: leftNode.id,
        rightNodeId: rightNode.id,
        rho,
        leftWeight: weights.get(leftNode.id)?.weight ?? 1,
        rightWeight: weights.get(rightNode.id)?.weight ?? 1,
      });
    }
  }

  return {
    pairs,
    weights,
  };
}

function collectConnectedGroup(
  startId: string,
  linkedNodeIds: Map<string, Set<string>>,
) {
  const visited = new Set<string>();
  const queue = [startId];

  for (let index = 0; index < queue.length; index += 1) {
    const nodeId = queue[index];
    if (visited.has(nodeId)) continue;

    visited.add(nodeId);
    linkedNodeIds.get(nodeId)?.forEach((linkedNodeId) => {
      if (!visited.has(linkedNodeId)) {
        queue.push(linkedNodeId);
      }
    });
  }

  return visited;
}
