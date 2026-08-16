import type { KnowledgeLossPoint } from '../knowledgeGraph/model/types';
import {
  AccuracyHistoryChart,
  LossHistoryChart,
} from './LossHistoryChart';
import './TrainingProcess.css';

export function TrainingProcessView({
  history,
}: {
  history: KnowledgeLossPoint[];
}) {
  return (
    <main className="canvas-wrap training-process-canvas">
      <div className="training-history-grid">
        <LossHistoryChart history={history} />
        <AccuracyHistoryChart history={history} />
      </div>
    </main>
  );
}
