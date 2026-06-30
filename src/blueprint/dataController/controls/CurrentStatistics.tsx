import type { DatasetSplitResult } from '../../knowledgeGraph/model/datasetSplit';
import type { KnowledgeLossReport } from '../../knowledgeGraph/model/lossMetrics';
import type { KnowledgeGraphStats } from '../../knowledgeGraph/model/types';
import { useLabels } from '../../../i18n/LanguageContext';
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
  const labels = useLabels().knowledgeGraph.controls.currentStatistics;

  return (
    <ControlSection title={labels.title}>
      <ControlGrid>
        <StatValue label={labels.nodes} value={stats.nodeCount} />
        <StatValue
          label={labels.maxDepth}
          value={stats.maxDependencyDepth}
        />
      </ControlGrid>
      <div className="knowledge-control-grid knowledge-control-grid-three">
        <StatValue label={labels.dependency} value={stats.dependencyEdgeCount} />
        <StatValue label={labels.substitute} value={stats.substituteEdgeCount} />
        <StatValue
          label={labels.interference}
          value={stats.interferenceEdgeCount}
        />
      </div>
      <ControlGrid>
        <StatValue label={labels.epoch} value={epoch} />
        <StatValue label={labels.dataSplit} value={`${dataset.totals.train}/${dataset.totals.val}/${dataset.totals.test}`} />
      </ControlGrid>
      <ControlGrid>
        <StatValue label={labels.trainLoss} value={format(loss.graphTrainLoss)} />
        <StatValue label={labels.valLoss} value={format(loss.graphValLoss)} />
      </ControlGrid>
    </ControlSection>
  );
}

function format(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : '';
}
