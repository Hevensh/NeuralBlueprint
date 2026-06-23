import type {
  UtilityEstimate,
  UtilityReport,
} from './utilityEstimate';
import type { KnowledgeEntity } from './types';

export type TrainingSignal = UtilityEstimate;

export function computeTrainingSignal(
  entity: KnowledgeEntity,
  utilities: UtilityReport,
  selectedStage: number,
): TrainingSignal {
  return computeStageTrainingSignal(entity, utilities, selectedStage);
}

export function computeStageTrainingSignal(
  entity: KnowledgeEntity,
  utilities: UtilityReport,
  stage: number,
): TrainingSignal {
  const report = utilities.stages[stage];
  const metric = entity.kind === 'node'
    ? report?.nodes[entity.id]
    : report?.edges[entity.id];
  return metric ?? emptySignal();
}

function emptySignal(): TrainingSignal {
  return {
    self: 0,
    adjacent: 0,
    total: 0,
  };
}
