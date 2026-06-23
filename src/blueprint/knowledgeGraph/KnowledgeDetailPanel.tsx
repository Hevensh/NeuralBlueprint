import { NumberField } from '../../NumberField';
import type {
  KnowledgeGraphEdgeData,
  KnowledgeGraphNodeData,
} from './KnowledgeGraphNodeTypes';
import { formatTrainingSignal } from './formatTrainingSignal';

interface KnowledgeDetailPanelProps {
  selectedNode: KnowledgeGraphNodeData | null;
  selectedEdge: KnowledgeGraphEdgeData | null;
  inferenceStage: number;
  maxInferenceStage: number;
  showMemory: boolean;
  showMetrics: boolean;
  onShowMemoryChange: () => void;
  onShowMetricsChange: () => void;
  onMemoryChange: (nodeId: string, memory: number) => void;
  onEdgeMemoryChange: (edgeId: string, memory: number) => void;
  onInferenceStageChange: (stage: number) => void;
}

export function KnowledgeDetailPanel({
  selectedNode,
  selectedEdge,
  inferenceStage,
  maxInferenceStage,
  showMemory,
  showMetrics,
  onShowMemoryChange,
  onShowMetricsChange,
  onMemoryChange,
  onEdgeMemoryChange,
  onInferenceStageChange,
}: KnowledgeDetailPanelProps) {
  return (
    <aside className="right-panel">
      <div className="title">Properties</div>
      <InferenceStageSlider
        max={maxInferenceStage}
        value={inferenceStage}
        onChange={onInferenceStageChange}
      />
      <div className="property-toggle-group">
        <button
          aria-pressed={showMemory}
          className={`toggle-button ${showMemory ? 'active' : ''}`}
          onClick={onShowMemoryChange}
          type="button"
        >
          Memory Allocation
        </button>
        <button
          aria-pressed={showMetrics}
          className={`toggle-button ${showMetrics ? 'active' : ''}`}
          onClick={onShowMetricsChange}
          type="button"
        >
          Mastery / Overfit
        </button>
      </div>
      {selectedEdge
        ? (
          <EdgeProperties
            selectedEdge={selectedEdge}
            showMemory={showMemory}
            showMetrics={showMetrics}
            onMemoryChange={onEdgeMemoryChange}
          />
        )
        : selectedNode
        ? (
          <NodeProperties
            selectedNode={selectedNode}
            showMemory={showMemory}
            showMetrics={showMetrics}
            onMemoryChange={onMemoryChange}
          />
        )
        : <div className="property-empty">No Element Selected</div>}
    </aside>
  );
}

function InferenceStageSlider({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (stage: number) => void;
}) {
  return (
    <div className="knowledge-stage-control">
      <div className="knowledge-stage-header">
        <span>Inference Stage</span>
        <strong>{value} / {max}</strong>
      </div>
      <input
        aria-label="Inference Stage"
        disabled={max === 0}
        max={max}
        min={0}
        step={1}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function EdgeProperties({
  selectedEdge,
  showMemory,
  showMetrics,
  onMemoryChange,
}: {
  selectedEdge: KnowledgeGraphEdgeData;
  showMemory: boolean;
  showMetrics: boolean;
  onMemoryChange: (edgeId: string, memory: number) => void;
}) {
  const { metrics } = selectedEdge;
  return (
    <div className="property-panel">
      <Value label="Type" value={selectedEdge.kind} />
      <Value label="Source" value={selectedEdge.source.name} />
      <Value label="Target" value={selectedEdge.target.name} />
      <Value label="Lambda" value={format(selectedEdge.properties.lambda)} />
      {showMemory && (
        <>
          <Value
            label="Required Memory"
            value={format(selectedEdge.properties.requiredMemory)}
          />
          <NumberField
            label={`Allocated Memory (${selectedEdge.memorySelectionLabel})`}
            min={0}
            value={metrics.allocatedMemory}
            onChange={(memory) => onMemoryChange(
              selectedEdge.id,
              Math.max(0, memory),
            )}
          />
        </>
      )}
      {showMetrics && (
        <>
          <Value
            label="Mastery"
            value={`${(metrics.mastery * 100).toFixed(2)}%`}
          />
          <Value
            label="Effective Mastery"
            value={`${(metrics.effectiveMastery * 100).toFixed(2)}%`}
          />
          <Value
            label="Overfit"
            value={`${metrics.overfitPercent.toFixed(2)}%`}
          />
          <TrainingProperties training={metrics.training} />
        </>
      )}
    </div>
  );
}

function NodeProperties({
  selectedNode,
  showMemory,
  showMetrics,
  onMemoryChange,
}: {
  selectedNode: KnowledgeGraphNodeData;
  showMemory: boolean;
  showMetrics: boolean;
  onMemoryChange: (nodeId: string, memory: number) => void;
}) {
  const { metrics } = selectedNode;
  return (
    <div className="property-panel">
      <Value label="Name" value={selectedNode.name} />
      <Value label="Neighbors" value={selectedNode.neighborCount} />
      <Value
        label="Data Split"
        value={`${metrics.trainDataAmount}/${metrics.valDataAmount}/${metrics.testDataAmount}`}
      />
      {showMemory && (
        <>
          <Value
            label="Required Memory"
            value={format(selectedNode.properties.requiredMemory)}
          />
          <NumberField
            label={`Allocated Memory (${selectedNode.memorySelectionLabel})`}
            min={0}
            value={metrics.allocatedMemory}
            onChange={(memory) => onMemoryChange(
              selectedNode.id,
              Math.max(0, memory),
            )}
          />
        </>
      )}
      {showMetrics && (
        <>
          <Value
            label="Effective Memory"
            value={format(metrics.effectiveRequiredMemory)}
          />
          <Value
            label="Mastery"
            value={`${(metrics.mastery * 100).toFixed(2)}%`}
          />
          <Value
            label="Overfit"
            value={`${metrics.overfitPercent.toFixed(2)}%`}
          />
          <TrainingProperties training={metrics.training} />
        </>
      )}
      <Value label="Train Loss" value={format(metrics.trainLoss)} />
      <Value label="Val Loss" value={format(metrics.valLoss)} />
    </div>
  );
}

function TrainingProperties({
  training,
}: {
  training: KnowledgeGraphNodeData['metrics']['training'];
}) {
  return (
    <>
      <Value
        label="Self Growth"
        value={formatTrainingSignal(training.self)}
      />
      <Value
        label="Adjacent Growth"
        value={formatTrainingSignal(training.adjacent)}
      />
      <Value
        label="Stage Utility Uₛ"
        value={formatTrainingSignal(training.total)}
      />
    </>
  );
}

function Value({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="property-field">
      <span className="property-label">{label}</span>
      <div className="property-value">{value}</div>
    </div>
  );
}

function format(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : '';
}
