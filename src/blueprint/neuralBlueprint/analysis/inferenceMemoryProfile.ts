import type {
  CNNNodeData,
  LinearNodeData,
  ModuleBaseNode,
  ModuleNodeData,
} from '../ModuleBaseNodeTypes';
import type {
  InferenceAdaptationPoints,
  InferenceDistanceAdaptationPoints,
  InferenceMemoryGroup,
  InferenceMemoryModel,
  InferenceMemoryProfile,
  InferenceRepetitionAdaptationPoints,
  InferenceMemoryStageSegment,
} from '../../InferenceMemoryProfileTypes';
import { computeVarianceLogDistance } from '../../InferenceMemoryVariance';
import { buildArrangeReachabilityMaps } from '../utils/arrangeNodesUtils';

export type {
  InferenceAdaptationPoints,
  InferenceDistanceAdaptationPoints,
  InferenceMemoryAggregationPair,
  InferenceMemoryGroup,
  InferenceMemoryModel,
  InferenceMemoryNodeWeight,
  InferenceMemoryProfile,
  InferenceMemoryStage,
  InferenceMemoryStageSegment,
  InferenceRepetitionAdaptationPoints,
} from '../../InferenceMemoryProfileTypes';

type TrainableNodeData = LinearNodeData | CNNNodeData;

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
    nodes: TrainableNodeData[];
  }>();

  nodes.forEach(({ data }) => {
    if (
      !isTrainableNode(data)
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
        adaptationPoints: floorAdaptationPoints(stats.adaptationPoints),
        varianceLogDistance: stats.varianceLogDistance,
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
  const totalAdaptationPoints = baseGroups.reduce(
    (total, group) => addAdaptationPoints(total, group.adaptationPoints),
    emptyAdaptationPoints(),
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
        adaptationPoints: scaleAdaptationPoints(
          group.adaptationPoints,
          1 / group.inferenceStages.length,
        ),
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
      const adaptationPoints = segments.reduce(
        (total, segment) => addAdaptationPoints(
          total,
          segment.adaptationPoints,
        ),
        emptyAdaptationPoints(),
      );

      return {
        stage,
        memoryPoint,
        adaptationPoints,
        ratio: getRatio(memoryPoint, totalMemoryPoint),
        segments,
      };
    });

  return {
    networkSignature: createNetworkSignature(nodes),
    totalMemoryPoint,
    totalAdaptationPoints,
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
    ...repetitionSignature(data),
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
    case '3DInput':
      return [
        data.outFeatures,
        data.inputEffectiveRank,
        data.normalizationMode,
        data.height,
        data.width,
      ];
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
    case 'CNN':
      return [
        data.outFeatures,
        data.kernelSize,
        data.stride,
        data.padding,
        data.dilation,
        data.initializationMode,
        data.biasInitializationMode,
      ];
    case 'Pooling':
      return [data.poolMode, data.kernelSize, data.stride, data.padding];
    case 'GlobalPooling':
      return [data.poolMode];
    case 'Output':
      return [
        data.neededTime,
        data.neededOutputDim,
        data.neededHeight,
        data.neededWidth,
      ];
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

function repetitionSignature(data: ModuleNodeData) {
  const memory = data.stats?.adaptation.repetition.memory;
  return memory
    ? [
      memory.small,
      memory.medium,
      memory.large,
      memory.extraLarge,
      memory.global,
    ]
    : ['', '', '', '', ''];
}

export function computeInferenceGroupProfile(
  nodes: TrainableNodeData[],
  allNodes: ModuleNodeData[],
) {
  const aggregation = computeGroupAggregation(nodes, allNodes);
  const nodeWeights = [...aggregation.weights.values()];
  const normalizedWeights = normalizeNodeWeights(nodes, aggregation.weights);

  return {
    memoryPoint: weightedMemoryPoint(nodes, aggregation.weights),
    adaptationPoints: {
      repetition: weightedRepetitionAdaptationPoints(nodes, allNodes),
      // Distance propagation has not been defined yet. Keep the resource
      // explicit and truthfully empty instead of estimating it from repetition.
      distance: emptyDistanceAdaptationPoints(),
    },
    varianceLogDistance: weightedVarianceLogDistance(nodes, normalizedWeights),
    nodeWeights,
    aggregationPairs: aggregation.pairs,
  };
}

function weightedMemoryPoint(
  nodes: TrainableNodeData[],
  weights: Map<string, { weight: number }>,
) {
  return nodes.reduce((sum, node) => {
    const memoryPoint = isFiniteNumber(node.memoryPoint)
      ? node.memoryPoint
      : 0;
    const weight = weights.get(node.id)?.weight ?? 1;
    return sum + memoryPoint * weight;
  }, 0);
}

function weightedRepetitionAdaptationPoints(
  nodes: TrainableNodeData[],
  allNodes: ModuleNodeData[],
) {
  const providers = nodes.filter(
    (node): node is CNNNodeData => node.kind === 'CNN',
  );
  const weights = computeGroupAggregation(providers, allNodes).weights;

  return providers.reduce<InferenceRepetitionAdaptationPoints>(
    (total, node) => {
      const memory = node.stats?.adaptation.repetition.memory;
      const weight = weights.get(node.id)?.weight ?? 1;
      if (!memory) return total;

      return {
        small: total.small + sanitizePoint(memory.small) * weight,
        medium: total.medium + sanitizePoint(memory.medium) * weight,
        large: total.large + sanitizePoint(memory.large) * weight,
        extraLarge: total.extraLarge
          + sanitizePoint(memory.extraLarge) * weight,
        global: total.global + sanitizePoint(memory.global) * weight,
      };
    },
    emptyRepetitionAdaptationPoints(),
  );
}

function weightedVarianceLogDistance(
  nodes: TrainableNodeData[],
  normalizedWeights: Map<string, number>,
) {
  return nodes.reduce((sum, node) => (
    sum
    + computeVarianceLogDistance(
      node.stats?.distribution.variance,
      node.statsBackward?.distribution.variance,
    )
    * (normalizedWeights.get(node.id) ?? 0)
  ), 0);
}

function normalizeNodeWeights(
  nodes: TrainableNodeData[],
  weights: Map<string, { weight: number }>,
) {
  const rawWeights = nodes.map((node) => ({
    nodeId: node.id,
    weight: Math.max(0, weights.get(node.id)?.weight ?? 1),
  }));
  const totalWeight = rawWeights.reduce(
    (sum, item) => sum + item.weight,
    0,
  );
  const fallbackWeight = nodes.length > 0 ? 1 / nodes.length : 0;

  return new Map(rawWeights.map((item) => [
    item.nodeId,
    totalWeight > 0
      ? item.weight / totalWeight
      : fallbackWeight,
  ]));
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

function computeGroupAggregation(
  nodes: TrainableNodeData[],
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

function isTrainableNode(data: ModuleNodeData): data is TrainableNodeData {
  return data.kind === 'Linear' || data.kind === 'CNN';
}

function emptyRepetitionAdaptationPoints(): InferenceRepetitionAdaptationPoints {
  return {
    small: 0,
    medium: 0,
    large: 0,
    extraLarge: 0,
    global: 0,
  };
}

function emptyDistanceAdaptationPoints(): InferenceDistanceAdaptationPoints {
  return {
    none: 0,
    short: 0,
    medium: 0,
    long: 0,
    global: 0,
  };
}

function emptyAdaptationPoints(): InferenceAdaptationPoints {
  return {
    repetition: emptyRepetitionAdaptationPoints(),
    distance: emptyDistanceAdaptationPoints(),
  };
}

function floorAdaptationPoints(
  points: InferenceAdaptationPoints,
): InferenceAdaptationPoints {
  return mapAdaptationPoints(points, Math.floor);
}

function scaleAdaptationPoints(
  points: InferenceAdaptationPoints,
  scale: number,
): InferenceAdaptationPoints {
  return mapAdaptationPoints(points, (value) => value * scale);
}

function mapAdaptationPoints(
  points: InferenceAdaptationPoints,
  map: (value: number) => number,
): InferenceAdaptationPoints {
  return {
    repetition: {
      small: map(points.repetition.small),
      medium: map(points.repetition.medium),
      large: map(points.repetition.large),
      extraLarge: map(points.repetition.extraLarge),
      global: map(points.repetition.global),
    },
    distance: {
      none: map(points.distance.none),
      short: map(points.distance.short),
      medium: map(points.distance.medium),
      long: map(points.distance.long),
      global: map(points.distance.global),
    },
  };
}

function addAdaptationPoints(
  left: InferenceAdaptationPoints,
  right: InferenceAdaptationPoints,
): InferenceAdaptationPoints {
  return {
    repetition: {
      small: left.repetition.small + right.repetition.small,
      medium: left.repetition.medium + right.repetition.medium,
      large: left.repetition.large + right.repetition.large,
      extraLarge: left.repetition.extraLarge + right.repetition.extraLarge,
      global: left.repetition.global + right.repetition.global,
    },
    distance: {
      none: left.distance.none + right.distance.none,
      short: left.distance.short + right.distance.short,
      medium: left.distance.medium + right.distance.medium,
      long: left.distance.long + right.distance.long,
      global: left.distance.global + right.distance.global,
    },
  };
}

function sanitizePoint(value: number) {
  return Math.max(Number.isFinite(value) ? value : 0, 0);
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
