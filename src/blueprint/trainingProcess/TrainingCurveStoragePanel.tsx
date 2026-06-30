import type { TrainingCurveSnapshot } from '../../dataStorage/trainingCurveStorage';
import { useLabels } from '../../i18n/LanguageContext';

export function TrainingCurveStoragePanel({
  snapshots,
  selectedSnapshotId,
  canSave,
  onSave,
  onSelect,
  onDelete,
  onClear,
}: {
  snapshots: TrainingCurveSnapshot[];
  selectedSnapshotId: string | null;
  canSave: boolean;
  onSave: () => void;
  onSelect: (snapshotId: string | null) => void;
  onDelete: (snapshotId: string) => void;
  onClear: () => void;
}) {
  const labels = useLabels().trainingProcess.curveStorage;

  return (
    <aside className="right-panel training-curve-storage">
      <div className="training-curve-storage-header">
        <strong>{labels.title}</strong>
        <button
          className="training-curve-clear"
          disabled={snapshots.length === 0}
          onClick={onClear}
          type="button"
        >
          {labels.clear}
        </button>
      </div>

      <button
        className="action-button"
        disabled={!canSave}
        onClick={onSave}
        type="button"
      >
        {labels.recordLossHistory}
      </button>
      <button
        className={`action-button ${selectedSnapshotId === null ? 'primary' : ''
          }`}
        onClick={() => onSelect(null)}
        type="button"
      >
        {labels.viewCurrentTraining}
      </button>

      <div className="training-curve-list">
        {snapshots.length === 0 && (
          <p className="property-empty">{labels.noSavedCurves}</p>
        )}
        {snapshots.map((snapshot) => {
          const bestVal = snapshot.history.reduce<
            { epoch: number; valLoss: number } | null
          >((best, point) => (
            typeof point.valLoss === 'number'
              && Number.isFinite(point.valLoss)
              && (!best || point.valLoss < best.valLoss)
              ? { epoch: point.epoch, valLoss: point.valLoss }
              : best
          ), null);
          return (
            <article
              className={`training-curve-card ${selectedSnapshotId === snapshot.id ? 'selected' : ''
                }`}
              key={snapshot.id}
            >
              <button
                className="training-curve-card-main"
                onClick={() => onSelect(snapshot.id)}
                type="button"
              >
                <strong>
                  {new Date(snapshot.createdAt).toLocaleString()}
                </strong>
                <span>{labels.epoch} {snapshot.epoch}</span>
                <span>{labels.bestEpoch} {bestVal?.epoch ?? 'N/A'}</span>
                <span>{labels.bestValLoss} {formatLoss(bestVal?.valLoss)}</span>
              </button>
              <button
                aria-label={`${labels.deleteCurveAtEpoch} ${snapshot.epoch}`}
                className="training-curve-delete"
                onClick={() => onDelete(snapshot.id)}
                type="button"
              >
                {labels.delete}
              </button>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function formatLoss(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(3)
    : 'N/A';
}
