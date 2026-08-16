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
  const reachableMetrics = utilities.stages
    .filter((report) => report.stage >= stage)
    .flatMap((report) => {
      const metric = entity.kind === 'node'
        ? report.nodes[entity.id]
        : report.edges[entity.id];
      return metric ? [metric] : [];
    });

  return reachableMetrics.reduce<TrainingSignal>((best, metric) => (
    metric.total > best.total ? metric : best
  ), emptySignal());
}

function emptySignal(): TrainingSignal {
  return {
    self: 0,
    adjacent: 0,
    total: 0,
  };
}
