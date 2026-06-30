import type {
  BlueprintTaskStatName,
  ModuleNodeSelector,
  TaskGuideCondition,
  TaskGuideConfig,
  TaskGuideStepAnimation,
  TaskGuideStepConfig,
  TrainingTaskStatName,
} from '../../taskData/taskGuideTypes';
import type { ModuleBaseNode } from '../neuralBlueprint/ModuleBaseNodeTypes';
import type { NeuralBlueprintTaskSnapshot, TaskRuntimeSnapshot } from './taskGuideSnapshot';

export interface EvaluatedTaskGuide {
  id: string;
  title: string;
  steps: EvaluatedTaskGuideStep[];
  activeStep: EvaluatedTaskGuideStep | null;
  completedStepCount: number;
  progressRatio: number;
}

export interface EvaluatedTaskGuideStep extends Omit<TaskGuideStepConfig, 'animation'> {
  animation?: TaskGuideStepAnimation;
  completed: boolean;
  active: boolean;
}

export function evaluateTaskGuide(
  guide: TaskGuideConfig,
  snapshot: TaskRuntimeSnapshot,
  persistedCompletedStepCount = 0,
): EvaluatedTaskGuide {
  const completedStepCount = nextCompletedStepCount(
    guide,
    snapshot,
    persistedCompletedStepCount,
  );
  const completedSteps = guide.steps.map((_, index) => (
    index < completedStepCount
  ));
  const activeIndex = completedStepCount >= guide.steps.length
    ? guide.steps.length - 1
    : completedStepCount;
  const steps = guide.steps.map((step, index) => {
    const active = index === activeIndex;
    return {
      ...step,
      animation: active
        ? activeAnimation(step.animation, snapshot)
        : firstAnimation(step.animation),
      completed: completedSteps[index],
      active,
    };
  });

  return {
    id: guide.id,
    title: guide.title,
    steps,
    activeStep: steps[activeIndex] ?? null,
    completedStepCount,
    progressRatio: guide.steps.length > 0
      ? completedStepCount / guide.steps.length
      : 1,
  };
}

function nextCompletedStepCount(
  guide: TaskGuideConfig,
  snapshot: TaskRuntimeSnapshot,
  persistedCompletedStepCount: number,
) {
  const completedStepCount = Math.max(
    0,
    Math.min(guide.steps.length, Math.floor(persistedCompletedStepCount)),
  );

  if (
    completedStepCount < guide.steps.length
    && evaluateCondition(
      guide.steps[completedStepCount].completeWhen,
      snapshot,
    )
  ) {
    return completedStepCount + 1;
  }

  return completedStepCount;
}

function activeAnimation(
  animation: TaskGuideStepConfig['animation'],
  snapshot: TaskRuntimeSnapshot,
) {
  const animations = toAnimationList(animation);
  return animations.find((item) => (
    !item.completeWhen || !evaluateCondition(item.completeWhen, snapshot)
  )) ?? animations.at(-1);
}

function firstAnimation(animation: TaskGuideStepConfig['animation']) {
  return toAnimationList(animation)[0];
}

function toAnimationList(animation: TaskGuideStepConfig['animation']) {
  return Array.isArray(animation)
    ? animation
    : animation
      ? [animation]
      : [];
}

function evaluateCondition(
  condition: TaskGuideCondition,
  snapshot: TaskRuntimeSnapshot,
): boolean {
  if (condition.type === 'activeWorkspace') {
    return snapshot.activeWorkspace === condition.workspace;
  }

  if (condition.type === 'workspaceVisited') {
    return snapshot.visitedWorkspaces.includes(condition.workspace);
  }

  if (condition.type === 'moduleNodeExists') {
    return Boolean(
      snapshot.neuralBlueprint?.nodes.some((node) => (
        moduleNodeMatches(node, condition.selector)
      )),
    );
  }

  if (condition.type === 'modulePathExists') {
    return hasModulePath(snapshot.neuralBlueprint, condition.chain);
  }

  if (condition.type === 'moduleReachabilityExists') {
    return hasModuleReachability(
      snapshot.neuralBlueprint,
      condition.from,
      condition.to,
      condition.via,
    );
  }

  if (condition.type === 'moduleCount') {
    return compareStat(
      snapshot.neuralBlueprint?.moduleCounts[condition.kind] ?? 0,
      condition,
    );
  }

  if (condition.type === 'selectedModuleNode') {
    const selectedNode = snapshot.neuralBlueprint?.nodes.find((node) => (
      node.id === snapshot.neuralBlueprint?.selectedNodeId
    ));
    return Boolean(
      selectedNode && moduleNodeMatches(selectedNode, condition.selector),
    );
  }

  if (condition.type === 'trainingFlag') {
    return (
      snapshot.trainingProcess?.[condition.flag] === (condition.value ?? true)
    );
  }

  if (condition.type === 'trainingStat') {
    return compareStat(
      getTrainingStat(snapshot, condition.stat),
      condition,
    );
  }

  return compareStat(
    getBlueprintStat(snapshot.neuralBlueprint, condition.stat),
    condition,
  );
}

function getTrainingStat(
  snapshot: TaskRuntimeSnapshot,
  stat: TrainingTaskStatName,
) {
  const value = snapshot.trainingProcess?.[stat];
  if (value !== undefined) return value;

  return stat === 'bestValLoss' || stat === 'savedBestValLoss'
    ? Number.POSITIVE_INFINITY
    : 0;
}

function hasModuleReachability(
  snapshot: NeuralBlueprintTaskSnapshot | undefined,
  from: ModuleNodeSelector,
  to: ModuleNodeSelector,
  via?: ModuleNodeSelector,
) {
  if (!snapshot) return false;

  const nodeById = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const edgesBySourceId = new Map<string, string[]>();

  snapshot.edges.forEach((edge) => {
    edgesBySourceId.set(edge.source, [
      ...(edgesBySourceId.get(edge.source) ?? []),
      edge.target,
    ]);
  });

  return snapshot.nodes.some((startNode) => {
    if (!moduleNodeMatches(startNode, from)) return false;

    const queue = [{
      nodeId: startNode.id,
      matchedVia: via ? moduleNodeMatches(startNode, via) : true,
    }];
    const visited = new Set<string>();

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const visitKey = `${current.nodeId}:${Number(current.matchedVia)}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);

      const node = nodeById.get(current.nodeId);
      if (!node) continue;

      if (
        current.nodeId !== startNode.id
        && current.matchedVia
        && moduleNodeMatches(node, to)
      ) {
        return true;
      }

      (edgesBySourceId.get(current.nodeId) ?? []).forEach((targetId) => {
        const targetNode = nodeById.get(targetId);
        if (!targetNode) return;
        queue.push({
          nodeId: targetId,
          matchedVia: current.matchedVia
            || Boolean(via && moduleNodeMatches(targetNode, via)),
        });
      });
    }

    return false;
  });
}

function hasModulePath(
  snapshot: NeuralBlueprintTaskSnapshot | undefined,
  chain: ModuleNodeSelector[],
): boolean {
  if (!snapshot || chain.length === 0) return false;

  const nodeById = new Map(snapshot.nodes.map((node) => [node.id, node]));
  let candidateIds = new Set(
    snapshot.nodes
      .filter((node) => moduleNodeMatches(node, chain[0]))
      .map((node) => node.id),
  );

  for (let index = 1; index < chain.length; index += 1) {
    const selector = chain[index];
    const nextCandidateIds = new Set<string>();

    snapshot.edges.forEach((edge) => {
      if (!candidateIds.has(edge.source)) return;

      const targetNode = nodeById.get(edge.target);
      if (targetNode && moduleNodeMatches(targetNode, selector)) {
        nextCandidateIds.add(targetNode.id);
      }
    });

    candidateIds = nextCandidateIds;
    if (candidateIds.size === 0) return false;
  }

  return candidateIds.size > 0;
}

function moduleNodeMatches(
  node: ModuleBaseNode,
  selector: ModuleNodeSelector,
): boolean {
  if (selector.id !== undefined && node.id !== selector.id) return false;
  if (selector.kind !== undefined && node.data.kind !== selector.kind) return false;
  if (selector.name !== undefined && node.data.name !== selector.name) return false;
  if (
    selector.predecessorId !== undefined
    && !node.data.predecessors.some((predecessor) => (
      predecessor.id === selector.predecessorId
    ))
  ) return false;
  if (
    selector.predecessorKind !== undefined
    && !node.data.predecessors.some((predecessor) => (
      predecessor.kind === selector.predecessorKind
    ))
  ) return false;
  if (
    selector.successorId !== undefined
    && !node.data.successors.some((successor) => (
      successor.id === selector.successorId
    ))
  ) return false;
  if (
    selector.successorKind !== undefined
    && !node.data.successors.some((successor) => (
      successor.kind === selector.successorKind
    ))
  ) return false;

  return matchesRecord(node.data, selector.props)
    && matchesMinRecord(node.data, selector.minProps)
    && matchesRecord(node.data.stats, selector.stats);
}

function matchesRecord(
  target: object | undefined,
  expected: Record<string, string | number | boolean> | undefined,
) {
  const indexedTarget = target as Record<string, unknown> | undefined;
  return Object.entries(expected ?? {}).every(([key, value]) => (
    indexedTarget?.[key] === value
  ));
}

function matchesMinRecord(
  target: object | undefined,
  expected: Record<string, number> | undefined,
) {
  const indexedTarget = target as Record<string, unknown> | undefined;
  return Object.entries(expected ?? {}).every(([key, min]) => {
    const value = indexedTarget?.[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= min;
  });
}

function getBlueprintStat(
  snapshot: NeuralBlueprintTaskSnapshot | undefined,
  stat: BlueprintTaskStatName,
) {
  if (!snapshot) return 0;
  return snapshot[stat];
}

function compareStat(
  value: number,
  condition: {
    min?: number;
    max?: number;
    equals?: number;
  },
) {
  if (condition.equals !== undefined) return value === condition.equals;
  if (condition.min !== undefined && value < condition.min) return false;
  if (condition.max !== undefined && value > condition.max) return false;
  return true;
}
