import type { ModuleBaseNode } from '../ModuleBaseNodeTypes';

export interface InferenceMemoryGroup {
  id: string;
  nodeIds: string[];
  inferenceStages: number[];
  memoryPoint: number;
  ratio: number;
}

export interface InferenceMemoryStageSegment {
  groupId: string;
  memoryPoint: number;
  ratio: number;
}

export interface InferenceMemoryStage {
  stage: number;
  memoryPoint: number;
  ratio: number;
  segments: InferenceMemoryStageSegment[];
}

export interface InferenceMemoryProfile {
  totalMemoryPoint: number;
  groups: InferenceMemoryGroup[];
  stages: InferenceMemoryStage[];
}

export function buildInferenceMemoryProfile(
  nodes: ModuleBaseNode[],
): InferenceMemoryProfile {
  const groupById = new Map<string, Omit<InferenceMemoryGroup, 'ratio'>>();

  nodes.forEach(({ data }) => {
    if (
      data.kind !== 'Linear'
      || !data.inferenceTopologyOrder?.size
      || !Number.isFinite(data.inferencePoint)
      || (data.inferencePoint as number) <= 0
    ) return;

    const inferenceStages = [...data.inferenceTopologyOrder].sort(
      (left, right) => left - right,
    );
    const id = inferenceStages.join(',');
    const group = groupById.get(id);

    if (group) {
      group.nodeIds.push(data.id);
      return;
    }

    groupById.set(id, {
      id,
      nodeIds: [data.id],
      inferenceStages,
      memoryPoint: data.inferencePoint as number,
    });
  });

  const baseGroups = [...groupById.values()].sort(compareInferenceGroups);
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
    totalMemoryPoint,
    groups,
    stages,
  };
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
