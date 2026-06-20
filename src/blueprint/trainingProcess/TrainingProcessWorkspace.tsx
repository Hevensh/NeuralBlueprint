import { useEffect, useMemo, useState } from 'react';
import { NetworkCapabilityControls } from '../knowledgeGraph/controls/NetworkCapabilityControls';
import { TrainingConfigurationControls } from '../knowledgeGraph/controls/TrainingConfigurationControls';
import type { KnowledgeGraphController } from '../knowledgeGraph/useKnowledgeGraphController';
import { TrainingCurveStoragePanel } from './TrainingCurveStoragePanel';
import { TrainingProcessView } from './TrainingProcessView';
import { TrainingStatistics } from './TrainingStatistics';
import {
  loadTrainingCurves,
  saveTrainingCurves,
  type TrainingCurveSnapshot,
} from './trainingCurveStorage';

export function TrainingProcessWorkspace({
  controller,
  fileId,
}: {
  controller: KnowledgeGraphController;
  fileId: string;
}) {
  const [snapshots, setSnapshots] = useState(
    () => loadTrainingCurves(fileId),
  );
  const [selectedSnapshotId, setSelectedSnapshotId] =
    useState<string | null>(null);
  const liveHistory = useMemo(() => (
    controller.lossHistory.length > 0
      ? controller.lossHistory
      : [{
          epoch: controller.networkState.epoch,
          trainLoss: controller.statistics.loss.graphTrainLoss,
          valLoss: controller.statistics.loss.graphValLoss,
        }]
  ), [
    controller.lossHistory,
    controller.networkState.epoch,
    controller.statistics.loss.graphTrainLoss,
    controller.statistics.loss.graphValLoss,
  ]);
  const selectedSnapshot = snapshots.find(
    (snapshot) => snapshot.id === selectedSnapshotId,
  );
  const visibleHistory = selectedSnapshot?.history ?? liveHistory;
  const visibleEpoch = selectedSnapshot?.epoch
    ?? controller.networkState.epoch;

  useEffect(() => {
    saveTrainingCurves(fileId, snapshots);
  }, [fileId, snapshots]);

  const saveCurve = () => {
    const snapshot: TrainingCurveSnapshot = {
      id: `curve-${Date.now()}`,
      createdAt: new Date().toISOString(),
      epoch: controller.networkState.epoch,
      history: liveHistory.map((point) => ({ ...point })),
    };
    setSnapshots((current) => [snapshot, ...current].slice(0, 20));
    setSelectedSnapshotId(snapshot.id);
  };
  const deleteCurve = (snapshotId: string) => {
    setSnapshots((current) => (
      current.filter((snapshot) => snapshot.id !== snapshotId)
    ));
    setSelectedSnapshotId((current) => (
      current === snapshotId ? null : current
    ));
  };

  return (
    <>
      <aside className="left-panel">
        <NetworkCapabilityControls {...controller.networkControls} />
        <TrainingConfigurationControls
          {...controller.trainingControls}
          disabled={selectedSnapshotId !== null}
        />
        <TrainingStatistics
          epoch={visibleEpoch}
          history={visibleHistory}
          loss={controller.statistics.loss}
        />
      </aside>

      <TrainingProcessView history={visibleHistory} />

      <TrainingCurveStoragePanel
        snapshots={snapshots}
        selectedSnapshotId={selectedSnapshotId}
        onSave={saveCurve}
        onSelect={setSelectedSnapshotId}
        onDelete={deleteCurve}
        onClear={() => {
          setSnapshots([]);
          setSelectedSnapshotId(null);
        }}
      />
    </>
  );
}
