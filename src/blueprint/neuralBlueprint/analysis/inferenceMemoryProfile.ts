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
  InferenceMemoryGroup,
  InferenceMemoryModel,
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
    .map(([id, group]) => ({
      id,
      nodeIds: group.nodes.map((node) => node.id),
      inferenceStages: group.inferenceStages,
      memoryPoint: Math.floor(averageNodeMemoryPoint(group.nodes)),
    }))
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

export function averageNodeMemoryPoint(nodes: LinearNodeData[]) {
  const memoryPoints = nodes
    .map((node) => node.memoryPoint)
    .filter(isFiniteNumber);

  if (memoryPoints.length === 0) return 0;

  return memoryPoints.reduce((sum, memoryPoint) => (
    sum + memoryPoint
  ), 0) / memoryPoints.length;
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
  return Number.isFinite(value);
}
