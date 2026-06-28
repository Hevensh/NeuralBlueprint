import type { DatasetSplitResult } from '../../knowledgeGraph/model/datasetSplit';
import type { KnowledgeLossReport } from '../../knowledgeGraph/model/lossMetrics';
import type { KnowledgeGraphStats } from '../../knowledgeGraph/model/types';
import { ControlGrid, ControlSection, StatValue } from './ControlSection';

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
      <ControlGrid>
        <StatValue label="Nodes" value={stats.nodeCount} />
        <StatValue
          label="Max Depth"
          value={stats.maxDependencyDepth}
        />
      </ControlGrid>
      <div className="knowledge-control-grid knowledge-control-grid-three">
        <StatValue label="Dependency" value={stats.dependencyEdgeCount} />
        <StatValue label="Substitute" value={stats.substituteEdgeCount} />
        <StatValue
          label="Interference"
          value={stats.interferenceEdgeCount}
        />
      </div>
      <ControlGrid>
        <StatValue label="Epoch" value={epoch} />
        <StatValue label="Data Split" value={`${dataset.totals.train}/${dataset.totals.val}/${dataset.totals.test}`} />
      </ControlGrid>
      <ControlGrid>
        <StatValue label="Train Loss" value={format(loss.graphTrainLoss)} />
        <StatValue label="Val Loss" value={format(loss.graphValLoss)} />
      </ControlGrid>
    </ControlSection>
  );
}

function format(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : '';
}
