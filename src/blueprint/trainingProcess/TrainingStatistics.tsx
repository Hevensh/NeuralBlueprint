import { ControlSection, StatValue } from '../knowledgeGraph/controls/ControlSection';
import type { KnowledgeLossPoint } from '../knowledgeGraph/model/knowledgeStorage';
import type { KnowledgeLossReport } from '../knowledgeGraph/model/lossMetrics';

export function TrainingStatistics({
  epoch,
  history,
  loss,
}: {
  epoch: number;
  history: KnowledgeLossPoint[];
  loss: KnowledgeLossReport;
}) {
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
    <ControlSection title="Training Statistics">
      <StatValue label="Train Epochs" value={epoch} />
      <StatValue
        label="Train Loss"
        value={formatLoss(latest?.trainLoss ?? loss.graphTrainLoss)}
      />
      <StatValue
        label="Val Loss"
        value={formatLoss(latestVal?.valLoss ?? loss.graphValLoss)}
      />
      <StatValue label="Best Epoch" value={bestVal?.epoch ?? 'N/A'} />
      <StatValue
        label="Best Val Loss"
        value={formatLoss(bestVal?.valLoss)}
      />
    </ControlSection>
  );
}

function formatLoss(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(4)
    : 'N/A';
}
