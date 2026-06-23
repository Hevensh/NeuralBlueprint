import { useEffect, useMemo, useState } from 'react';
import { NetworkCapabilityControls } from '../dataController/controls/NetworkCapabilityControls';
import { TrainingConfigurationControls } from '../dataController/controls/TrainingConfigurationControls';
import type { BlueprintDataController } from '../dataController/useBlueprintDataController';
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
  controller: BlueprintDataController;
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
          epoch: controller.statistics.epoch,
          trainLoss: controller.statistics.loss.graphTrainLoss,
          valLoss: controller.statistics.loss.graphValLoss,
        }]
  ), [
    controller.lossHistory,
    controller.statistics.epoch,
    controller.statistics.loss.graphTrainLoss,
    controller.statistics.loss.graphValLoss,
  ]);
  const selectedSnapshot = snapshots.find(
    (snapshot) => snapshot.id === selectedSnapshotId,
  );
  const visibleHistory = selectedSnapshot?.history ?? liveHistory;
  const visibleEpoch = selectedSnapshot?.epoch
    ?? controller.statistics.epoch;

  useEffect(() => {
    saveTrainingCurves(fileId, snapshots);
  }, [fileId, snapshots]);

  const saveCurve = () => {
    const snapshot: TrainingCurveSnapshot = {
      id: `curve-${Date.now()}`,
      createdAt: new Date().toISOString(),
      epoch: controller.statistics.epoch,
      history: liveHistory.map((point) => ({ ...point })),
      graphGeneration: {
        minNodes: controller.graphControls.minNodes,
        maxNodes: controller.graphControls.maxNodes,
        datasetCount: controller.graphControls.datasetCount,
        seed: controller.graphControls.seed,
      },
      networkCapability: {
        memoryPoints: controller.statistics.stats.availableMemoryPoints,
        reasoningPoints: controller.statistics.stats.availableReasoningPoints,
        seed: controller.networkControls.initializationSeed,
      },
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
