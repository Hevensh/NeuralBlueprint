import { useEffect, useState } from 'react';
import type { ResolvedBlueprintTaskFeatureConfig } from '../../taskData/blueprintFeatureConfig';
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
} from '../../dataStorage/trainingCurveStorage';

export function TrainingProcessWorkspace({
  controller,
  features,
  fileId,
  showMemoryReasoningControls = true,
}: {
  controller: BlueprintDataController;
  features: ResolvedBlueprintTaskFeatureConfig['knowledgeGraph'];
  fileId: string;
  showMemoryReasoningControls?: boolean;
}) {
  const [snapshots, setSnapshots] = useState(
    () => loadTrainingCurves(fileId),
  );
  const [selectedSnapshotId, setSelectedSnapshotId] =
    useState<string | null>(null);
  const liveHistory = controller.lossHistory;
  const selectedSnapshot = snapshots.find(
    (snapshot) => snapshot.id === selectedSnapshotId,
  );
  const visibleHistory = selectedSnapshot?.history ?? liveHistory;
  const visibleEpoch = selectedSnapshot?.epoch
    ?? controller.statistics.epoch;

  useEffect(() => {
    saveTrainingCurves(fileId, snapshots);
  }, [fileId, snapshots]);

  useEffect(() => {
    if (
      !controller.trainingControls.trainDisabled
      || liveHistory.length > 0
      || selectedSnapshotId === null
    ) return;

    const timer = window.setTimeout(() => setSelectedSnapshotId(null), 0);
    return () => window.clearTimeout(timer);
  }, [
    controller.trainingControls.trainDisabled,
    liveHistory.length,
    selectedSnapshotId,
  ]);

  const saveCurve = () => {
    if (liveHistory.length === 0) return;

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
        <NetworkCapabilityControls
          {...controller.networkControls}
          mode={features.networkCapabilityMode}
          onInitialize={() => {
            setSelectedSnapshotId(null);
            controller.networkControls.onInitialize();
          }}
          showMemoryReasoningControls={showMemoryReasoningControls}
        />
        <TrainingConfigurationControls
          {...controller.trainingControls}
          disabled={selectedSnapshotId !== null}
          showAllocationButtons={features.showAllocationButtons}
        />
        <TrainingStatistics
          epoch={visibleEpoch}
          history={visibleHistory}
          loss={controller.statistics.loss}
        />
      </aside>

      <TrainingProcessView history={visibleHistory} />

      <TrainingCurveStoragePanel
        canSave={liveHistory.length > 0}
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
