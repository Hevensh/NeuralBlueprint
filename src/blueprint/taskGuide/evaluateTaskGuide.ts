import type {
  BlueprintTaskStatName,
  ModuleNodeSelector,
  TaskGuideCondition,
  TaskGuideConfig,
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

export interface EvaluatedTaskGuideStep extends TaskGuideStepConfig {
  completed: boolean;
  active: boolean;
}

export function evaluateTaskGuide(
  guide: TaskGuideConfig,
  snapshot: TaskRuntimeSnapshot,
): EvaluatedTaskGuide {
  const completedSteps = guide.steps.map((step) => (
    evaluateCondition(step.completeWhen, snapshot)
  ));
  const firstIncompleteIndex = completedSteps.findIndex((completed) => !completed);
  const activeIndex = firstIncompleteIndex === -1
    ? guide.steps.length - 1
    : firstIncompleteIndex;
  const steps = guide.steps.map((step, index) => ({
    ...step,
    completed: completedSteps[index],
    active: index === activeIndex,
  }));
  const completedStepCount = completedSteps.filter(Boolean).length;

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

function evaluateCondition(
  condition: TaskGuideCondition,
  snapshot: TaskRuntimeSnapshot,
): boolean {
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
  return snapshot.trainingProcess?.[stat] ?? 0;
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

  return matchesRecord(node.data, selector.props)
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
