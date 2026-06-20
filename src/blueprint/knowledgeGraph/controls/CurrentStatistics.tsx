import type { DatasetSplitResult } from '../model/datasetSplit';
import type { KnowledgeLossReport } from '../model/lossMetrics';
import type { KnowledgeGraphStats } from '../model/types';
import { ControlSection, StatValue } from './ControlSection';

export interface CurrentStatisticsProps {
  stats: KnowledgeGraphStats;
  loss: KnowledgeLossReport;
  dataset: DatasetSplitResult;
  epoch: number;
}

export function CurrentStatistics({
  stats,
  loss,
  dataset,
  epoch,
}: CurrentStatisticsProps) {
  return (
    <ControlSection title="Current Statistics">
      <StatValue label="Nodes" value={stats.nodeCount} />
      <StatValue label="Dependency Edges" value={stats.dependencyEdgeCount} />
      <StatValue label="Substitute Edges" value={stats.substituteEdgeCount} />
      <StatValue
        label="Interference Edges"
        value={stats.interferenceEdgeCount}
      />
      <StatValue label="Epoch" value={epoch} />
      <StatValue label="Data Split" value={`${dataset.totals.train}/${dataset.totals.val}/${dataset.totals.test}`} />
      <StatValue label="Train Loss" value={format(loss.graphTrainLoss)} />
      <StatValue label="Val Loss" value={format(loss.graphValLoss)} />
    </ControlSection>
  );
}

function format(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : '';
}
