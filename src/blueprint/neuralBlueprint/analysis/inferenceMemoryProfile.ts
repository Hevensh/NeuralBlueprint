import type {
  CNNNodeData,
  LinearNodeData,
  ModuleBaseNode,
  ModuleNodeData,
  PatchEmbeddingNodeData,
  ResNetStageNodeData,
} from '../ModuleBaseNodeTypes';
import type {
  InferenceMemoryGroup,
  InferenceMemoryModel,
  InferenceMemoryProfile,
  InferenceMemoryStageSegment,
} from '../../InferenceMemoryProfileTypes';
import type {
  SpatialAdaptationCapability,
  SpatialBandPoints,
} from '../../SpatialAdaptationTypes';
import {
  addSpatialAdaptationCapability,
  createSpatialAdaptationCapability,
  createSpatialBandPoints,
  mapSpatialAdaptationCapability,
  SPATIAL_AXES,
} from '../../SpatialAdaptationTypes';
import { computeVarianceLogDistance } from '../../InferenceMemoryVariance';
import { buildArrangeReachabilityMaps } from '../utils/arrangeNodesUtils';
import { spatialViewAxisPoints } from './spatialView';
import { estimateTrainingResourceProfile } from './trainingResources';

export type {
  InferenceMemoryAggregationPair,
  InferenceMemoryGroup,
  InferenceMemoryModel,
  InferenceMemoryNodeWeight,
  InferenceMemoryProfile,
  InferenceMemoryStage,
  InferenceMemoryStageSegment,
} from '../../InferenceMemoryProfileTypes';

type TrainableNodeData = LinearNodeData | CNNNodeData | PatchEmbeddingNodeData | ResNetStageNodeData;

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

    const inferenceStages = [...(
      data.kind === 'ResNetStage'
        ? data.internalInferenceTopologyOrder ?? data.inferenceTopologyOrder
        : data.inferenceTopologyOrder
    )].sort(
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
        adaptationCapability: floorSpatialCapability(
          stats.adaptationCapability,
        ),
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
  const totalAdaptationCapability = baseGroups.reduce(
    (total, group) => addSpatialAdaptationCapability(
      total,
      group.adaptationCapability,
    ),
    createSpatialAdaptationCapability(),
  );
  const groups = baseGroups.map((group) => ({
    ...group,
    ratio: getRatio(group.memoryPoint, totalMemoryPoint),
  }));
  const aggregationWeightByNodeId = computePretrainingAggregationWeights(
    groups,
    nodeData,
  );
  const stageSegments = new Map<number, InferenceMemoryStageSegment[]>();

  groups.forEach((group) => {
    const allocatedMemoryPoint = group.memoryPoint / group.inferenceStages.length;

    group.inferenceStages.forEach((stage) => {
      const segments = stageSegments.get(stage) ?? [];
      segments.push({
        groupId: group.id,
        memoryPoint: allocatedMemoryPoint,
        adaptationCapability: scaleSpatialCapability(
          group.adaptationCapability,
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
      const adaptationCapability = segments.reduce(
        (total, segment) => addSpatialAdaptationCapability(
          total,
          segment.adaptationCapability,
        ),
        createSpatialAdaptationCapability(),
      );

      return {
        stage,
        memoryPoint,
        adaptationCapability,
        ratio: getRatio(memoryPoint, totalMemoryPoint),
        segments,
      };
    });

  return {
    networkSignature: createNetworkSignature(nodes),
    pretrainingModules: nodeData.flatMap((data) => {
      if (
        data.kind !== 'ResNetStage'
        || data.pretrainingOrder <= 0
        || data.pretrainedDependencyMemoryPoints <= 0
      ) return [];
      const inferenceStages = [
        ...(data.internalInferenceTopologyOrder
          ?? data.inferenceTopologyOrder
          ?? []),
      ].sort((left, right) => left - right);
      return inferenceStages.length > 0
        ? [{
            nodeId: data.id,
            order: Math.floor(data.pretrainingOrder),
            memoryPointsPerDependency: Math.floor(
              data.pretrainedDependencyMemoryPoints,
            ),
            aggregationWeight: Math.max(
              0,
              aggregationWeightByNodeId.get(data.id) ?? 1,
            ),
            inferenceStages,
          }]
        : [];
    }),
    totalMemoryPoint,
    totalAdaptationCapability,
    groups,
    stages,
    trainingResources: estimateTrainingResourceProfile(nodes),
  };
}

function computePretrainingAggregationWeights(
  groups: InferenceMemoryGroup[],
  nodes: ModuleNodeData[],
) {
  const transferByNodeId = new Map(nodes.flatMap((node) => (
    node.kind === 'ResNetStage'
      && node.pretrainingOrder > 0
      && node.pretrainedDependencyMemoryPoints > 0
      ? [[node.id, {
          order: Math.floor(node.pretrainingOrder),
          memoryPoints: Math.floor(node.pretrainedDependencyMemoryPoints),
        }] as const]
      : []
  )));
  const weights = new Map<string, number>();

  groups.forEach((group) => {
    const pretrainedNodeIds = group.nodeIds.filter((nodeId) => (
      transferByNodeId.has(nodeId)
    ));
    pretrainedNodeIds.forEach((nodeId) => {
      const transfer = transferByNodeId.get(nodeId);
      const correlationSum = group.aggregationPairs.reduce((sum, pair) => {
        const otherNodeId = pair.leftNodeId === nodeId
          ? pair.rightNodeId
          : pair.rightNodeId === nodeId
            ? pair.leftNodeId
            : undefined;
        const otherTransfer = otherNodeId === undefined
          ? undefined
          : transferByNodeId.get(otherNodeId);
        return transfer !== undefined
          && otherTransfer?.order === transfer.order
          && otherTransfer.memoryPoints === transfer.memoryPoints
          ? sum + Math.max(0, pair.rho)
          : sum;
      }, 0);
      weights.set(nodeId, 1 / (1 + correlationSum));
    });
  });
  return weights;
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
        data.time,
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
    case 'ResNetStage':
      return [
        data.outFeatures,
        data.blockCount,
        data.stride,
        data.pretrainingOrder,
        data.pretrainedDependencyMemoryPoints,
        data.initializationMode,
        data.biasInitializationMode,
      ];
    case 'PatchEmbedding':
      return [
        data.outFeatures,
        data.patchHeight,
        data.patchWidth,
        data.strideHeight,
        data.strideWidth,
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
  const capability = data.stats?.adaptation.repetition.effective;
  return capability
    ? [
      capability.small,
      capability.medium,
      capability.large,
      capability.extraLarge,
      capability.global,
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
    adaptationCapability: weightedSpatialCapability(nodes, allNodes),
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

function weightedSpatialCapability(
  nodes: TrainableNodeData[],
  allNodes: ModuleNodeData[],
) {
  const providers = nodes.filter(
    (node): node is CNNNodeData | PatchEmbeddingNodeData | ResNetStageNodeData => (
      node.kind === 'CNN'
      || node.kind === 'PatchEmbedding'
      || node.kind === 'ResNetStage'
    ),
  );
  const weights = computeGroupAggregation(providers, allNodes).weights;

  const distance = providers.reduce<SpatialBandPoints>(
    (total, node) => {
      const capability = node.stats?.adaptation.distanceIndex;
      const weight = weights.get(node.id)?.weight ?? 1;
      if (!capability) return total;

      return {
        small: total.small + sanitizePoint(capability.short) * weight,
        medium: total.medium + sanitizePoint(capability.medium) * weight,
        large: total.large + sanitizePoint(capability.long) * weight,
        extraLarge: total.extraLarge,
        global: total.global + sanitizePoint(capability.global) * weight,
      };
    },
    createSpatialBandPoints(),
  );
  const capability = createSpatialAdaptationCapability();
  providers.forEach((node) => {
    if (!node.stats?.spatialView) return;
    const weight = weights.get(node.id)?.weight ?? 1;
    SPATIAL_AXES.forEach((axis) => {
      const points = spatialViewAxisPoints(node.stats!.spatialView, axis);
      Object.entries(points).forEach(([band, value]) => {
        const key = band as keyof SpatialBandPoints;
        capability[axis].scale[key] += sanitizePoint(value) * weight;
      });
    });
  });

  // Distance-index propagation is still symmetric until directional index
  // modules are introduced; view scale is already derived per T/H/W axis.
  capability.height.index = { ...distance };
  capability.width.index = { ...distance };
  return capability;
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
  return data.kind === 'Linear'
    || data.kind === 'CNN'
    || data.kind === 'PatchEmbedding'
    || data.kind === 'ResNetStage';
}

function floorSpatialCapability(
  capability: SpatialAdaptationCapability,
): SpatialAdaptationCapability {
  return mapSpatialAdaptationCapability(capability, Math.floor);
}

function scaleSpatialCapability(
  capability: SpatialAdaptationCapability,
  scale: number,
): SpatialAdaptationCapability {
  return mapSpatialAdaptationCapability(
    capability,
    (value) => value * scale,
  );
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
