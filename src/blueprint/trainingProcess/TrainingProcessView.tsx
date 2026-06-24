import type { KnowledgeLossPoint } from '../knowledgeGraph/model/types';
import { LossHistoryChart } from './LossHistoryChart';
import './TrainingProcess.css';

export function TrainingProcessView({
  history,
}: {
  history: KnowledgeLossPoint[];
}) {
  return (
    <main className="canvas-wrap training-process-canvas">
      <LossHistoryChart history={history} />
    </main>
  );
}
