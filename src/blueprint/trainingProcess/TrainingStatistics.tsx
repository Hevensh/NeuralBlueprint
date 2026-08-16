import {
  ControlGrid,
  ControlSection,
  StatValue,
} from '../dataController/controls/ControlSection';
import type { KnowledgeLossPoint } from '../knowledgeGraph/model/types';
import type { KnowledgeLossReport } from '../knowledgeGraph/model/lossMetrics';
import { useLabels } from '../../i18n/useLanguage';

export function TrainingStatistics({
  epoch,
  history,
  loss,
  pretraining,
}: {
  epoch: number;
  history: KnowledgeLossPoint[];
  loss: KnowledgeLossReport;
  pretraining?: { source: string };
}) {
  const labels = useLabels().trainingProcess.statistics;
  const latest = history.at(-1);
  const latestVal = history.findLast(
    (point) => typeof point.valLoss === 'number'
      && Number.isFinite(point.valLoss),
  );
  const latestAccuracy = history.findLast(
    (point) => typeof point.valAccuracy === 'number'
      && Number.isFinite(point.valAccuracy),
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
      <StatValue
        label={labels.initialization}
        value={pretraining ? `${labels.pretrained} (${pretraining.source})` : labels.scratch}
      />
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
      {typeof loss.graphValAccuracy === 'number' && (
        <ControlGrid>
          <StatValue
            label={labels.trainAccuracy}
            value={formatAccuracy(latest?.trainAccuracy ?? loss.graphTrainAccuracy)}
          />
          <StatValue
            label={labels.valAccuracy}
            value={formatAccuracy(latestAccuracy?.valAccuracy ?? loss.graphValAccuracy)}
          />
        </ControlGrid>
      )}
    </ControlSection>
  );
}

function formatLoss(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(4)
    : 'N/A';
}

function formatAccuracy(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : 'N/A';
}
