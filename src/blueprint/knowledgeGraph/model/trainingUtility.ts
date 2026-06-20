import { readEntityMemory } from './masterOperations';
import type { ReasoningMasteryEstimate } from './reasoning';
import type {
  AnyKnowledgeEdge,
  KnowledgeEntity,
  KnowledgeNode,
  MasterGraph,
} from './types';

export function computeExploreBaseWeight(
  entity: KnowledgeEntity,
  master: MasterGraph,
  estimate: ReasoningMasteryEstimate,
): number {
  const allocated = Math.max(0, readEntityMemory(master, entity));
  if (entity.kind === 'node') {
    return inverse(allocated + effectiveCost(entity, estimate));
  }

  return edgeWeight(entity, allocated, estimate);
}

function edgeWeight(
  edge: AnyKnowledgeEdge,
  allocated: number,
  estimate: ReasoningMasteryEstimate,
) {
  return (
    inverse(
      allocated
      + edge.stats.requiredMemory
      + effectiveCost(edge.source, estimate),
    )
    + inverse(
      allocated
      + edge.stats.requiredMemory
      + effectiveCost(edge.target, estimate),
    )
  ) / 2;
}

function effectiveCost(
  node: KnowledgeNode,
  estimate: ReasoningMasteryEstimate,
) {
  return Math.max(0, estimate.effectiveCost[node.id] ?? node.requiredMemory);
}

function inverse(value: number) {
  return 1 / Math.max(Number.EPSILON, value);
}
