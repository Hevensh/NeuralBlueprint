import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { NumberField } from '../../NumberField';
import { useLabels } from '../../i18n/LanguageContext';
import type {
  DatasetSplitRatio,
  KnowledgeDataset,
  KnowledgeDatasetCollection,
} from './model/datasetSplit';

type DatasetStyle = CSSProperties & {
  '--knowledge-dataset-color': string;
};

interface KnowledgeDatasetSelectorProps {
  collection: KnowledgeDatasetCollection;
  onEnabledChange: (datasetId: string, enabled: boolean) => void;
  onPreviewChange: (dataset: KnowledgeDataset | null) => void;
  onSelectionChange: (dataset: KnowledgeDataset | null) => void;
  onSplitRatioChange: (
    datasetId: string,
    splitRatio: DatasetSplitRatio,
  ) => void;
  onSeedChange: (datasetId: string, seed: string) => void;
}

export function KnowledgeDatasetSelector({
  collection,
  onEnabledChange,
  onPreviewChange,
  onSelectionChange,
  onSplitRatioChange,
  onSeedChange,
}: KnowledgeDatasetSelectorProps) {
  const labels = useLabels().knowledgeGraph.datasets;
  const [open, setOpen] = useState(false);
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [pendingDatasetId, setPendingDatasetId] = useState<string | null>(null);
  const selectorRef = useRef<HTMLElement>(null);
  const enabledCount = collection.datasets.filter(
    (dataset) => dataset.enabled,
  ).length;

  useEffect(() => {
    if (!pendingDatasetId) {
      onPreviewChange(null);
      return;
    }
    const dataset = collection.datasets.find(
      (candidate) => candidate.id === pendingDatasetId,
    ) ?? null;
    const timer = window.setTimeout(() => onPreviewChange(dataset), 1000);
    return () => window.clearTimeout(timer);
  }, [collection.datasets, onPreviewChange, pendingDatasetId]);

  useEffect(() => {
    const clearEditingOnOutsidePointer = (event: PointerEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setEditingDatasetId(null);
        onSelectionChange(null);
      }
    };
    window.addEventListener('pointerdown', clearEditingOnOutsidePointer, true);
    return () => window.removeEventListener(
      'pointerdown',
      clearEditingOnOutsidePointer,
      true,
    );
  }, [onSelectionChange]);

  const stopCanvasInteraction = (event: MouseEvent) => {
    event.stopPropagation();
  };
  const startPreview = (datasetId: string) => setPendingDatasetId(datasetId);
  const stopPreview = (datasetId: string) => {
    setPendingDatasetId((current) => current === datasetId ? null : current);
  };

  return (
    <section
      aria-label={labels.title}
      className={`knowledge-dataset-selector ${open ? 'open' : ''} nodrag nopan`}
      onClick={stopCanvasInteraction}
      onMouseDown={stopCanvasInteraction}
      onMouseLeave={() => setPendingDatasetId(null)}
      ref={selectorRef}
    >
      <button
        className="knowledge-dataset-selector-toggle"
        onClick={() => {
          setOpen((current) => !current);
          setEditingDatasetId(null);
          onSelectionChange(null);
        }}
        type="button"
      >
        <strong>{labels.title}</strong>
        <span>{enabledCount}/{collection.datasets.length}</span>
        <span>{open ? labels.hide : labels.show}</span>
      </button>

      {!open && (
        <div className="knowledge-dataset-mini-list">
          {collection.datasets.map((dataset) => (
            <button
              aria-label={`${dataset.label}: ${
                dataset.enabled ? labels.enabled : labels.disabled
              }`}
              aria-pressed={dataset.enabled}
              className={`knowledge-dataset-mini ${
                dataset.enabled ? 'enabled' : 'disabled'
              }`}
              key={dataset.id}
              onClick={() => onEnabledChange(dataset.id, !dataset.enabled)}
              onMouseEnter={() => startPreview(dataset.id)}
              onMouseLeave={() => stopPreview(dataset.id)}
              style={{
                '--knowledge-dataset-color': dataset.color,
              } as DatasetStyle}
              title={dataset.label}
              type="button"
            />
          ))}
        </div>
      )}

      {open && (
        <div
          className="knowledge-dataset-card-list"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setEditingDatasetId(null);
              onSelectionChange(null);
            }
          }}
        >
          {collection.datasets.map((dataset) => {
            const coveredCount = Object.values(dataset.nodeDataAmounts)
              .filter((amount) => amount > 0).length;
            const totalAmount = Object.values(dataset.nodeDataAmounts)
              .reduce((sum, amount) => sum + amount, 0);
            const editing = editingDatasetId === dataset.id;

            return (
              <div
                className="knowledge-dataset-card-wrap"
                key={dataset.id}
                onMouseEnter={() => startPreview(dataset.id)}
                onMouseLeave={() => stopPreview(dataset.id)}
                style={{
                  '--knowledge-dataset-color': dataset.color,
                } as DatasetStyle}
              >
                <div className={`knowledge-dataset-card ${
                  editing ? 'editing' : ''
                }`}>
                  <button
                    className="knowledge-dataset-card-main"
                    onClick={() => {
                      setEditingDatasetId(editing ? null : dataset.id);
                      onSelectionChange(editing ? null : dataset);
                    }}
                    type="button"
                  >
                    <strong>{dataset.label}</strong>
                    <span>{labels.covered} {coveredCount}</span>
                    <span>{labels.data} {totalAmount}</span>
                    <span>{labels.split} {formatRatio(dataset.splitRatio)}</span>
                  </button>
                  <button
                    aria-label={`${dataset.enabled ? labels.disable : labels.enable} ${
                      dataset.label
                    }`}
                    aria-pressed={dataset.enabled}
                    className={`knowledge-dataset-status ${
                      dataset.enabled ? 'enabled' : 'disabled'
                    }`}
                    onClick={() => onEnabledChange(
                      dataset.id,
                      !dataset.enabled,
                    )}
                    title={dataset.enabled ? labels.enabled : labels.disabled}
                    type="button"
                  />
                </div>
                {editing && (
                  <DatasetSettings
                    dataset={dataset}
                    labels={labels}
                    onSeedChange={onSeedChange}
                    onSplitRatioChange={onSplitRatioChange}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DatasetSettings({
  dataset,
  labels,
  onSplitRatioChange,
  onSeedChange,
}: {
  dataset: KnowledgeDataset;
  labels: ReturnType<typeof useLabels>['knowledgeGraph']['datasets'];
  onSplitRatioChange: (
    datasetId: string,
    splitRatio: DatasetSplitRatio,
  ) => void;
  onSeedChange: (datasetId: string, seed: string) => void;
}) {
  return (
    <div className="knowledge-dataset-settings">
      <strong>{dataset.label} {labels.settings}</strong>
      <div className="knowledge-dataset-ratio-grid">
        {(['train', 'val', 'test'] as const).map((key) => (
          <NumberField
            className="knowledge-dataset-ratio-field"
            key={key}
            label={labels[key]}
            min={0}
            onChange={(value) => onSplitRatioChange(dataset.id, {
              ...dataset.splitRatio,
              [key]: Math.max(0, Math.floor(value)),
            })}
            value={dataset.splitRatio[key]}
          />
        ))}
      </div>
      <label className="knowledge-dataset-seed">
        <span>{labels.splitSeed}</span>
        <input
          className="property-input"
          onChange={(event) => onSeedChange(dataset.id, event.target.value)}
          type="text"
          value={dataset.seed}
        />
      </label>
    </div>
  );
}

function formatRatio(ratio: DatasetSplitRatio) {
  return `${ratio.train}/${ratio.val}/${ratio.test}`;
}
