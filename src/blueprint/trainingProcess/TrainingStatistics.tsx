import {
  ControlGrid,
  ControlSection,
  StatValue,
} from '../dataController/controls/ControlSection';
import type { KnowledgeLossPoint } from '../knowledgeGraph/model/types';
import type { KnowledgeLossReport } from '../knowledgeGraph/model/lossMetrics';
import { useLabels } from '../../i18n/LanguageContext';

export function TrainingStatistics({
  epoch,
  history,
  loss,
}: {
  epoch: number;
  history: KnowledgeLossPoint[];
  loss: KnowledgeLossReport;
}) {
  const labels = useLabels().trainingProcess.statistics;
  const latest = history.at(-1);
  const latestVal = history.findLast(
    (point) => typeof point.valLoss === 'number'
      && Number.isFinite(point.valLoss),
  );
  const bestVal = history.reduce<KnowledgeLossPoint | null>((best, point) => (
    typeof point.valLoss === 'number'
      && Number.isFinite(point.valLoss)
      && (best?.valLoss == null || point.valLoss < best.valLoss)
      ? point
      : best
  ), null);

  return (
    <ControlSection title={labels.title}>
      <StatValue label={labels.trainEpochs} value={epoch} />
      <ControlGrid>
        <StatValue
          label={labels.trainLoss}
          value={formatLoss(latest?.trainLoss ?? loss.graphTrainLoss)}
        />
        <StatValue
          label={labels.valLoss}
          value={formatLoss(latestVal?.valLoss ?? loss.graphValLoss)}
        />
      </ControlGrid>
      <ControlGrid>
        <StatValue label={labels.bestEpoch} value={bestVal?.epoch ?? 'N/A'} />
        <StatValue
          label={labels.bestValLoss}
          value={formatLoss(bestVal?.valLoss)}
        />
      </ControlGrid>
    </ControlSection>
  );
}

function formatLoss(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(4)
    : 'N/A';
}
