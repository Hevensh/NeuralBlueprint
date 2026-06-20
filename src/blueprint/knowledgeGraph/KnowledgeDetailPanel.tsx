import { NumberField } from '../../NumberField';
import type {
  KnowledgeGraphEdgeData,
  KnowledgeGraphNodeData,
} from './KnowledgeGraphNodeTypes';

interface KnowledgeDetailPanelProps {
  selectedNode: KnowledgeGraphNodeData | null;
  selectedEdge: KnowledgeGraphEdgeData | null;
  showMemory: boolean;
  showMetrics: boolean;
  onShowMemoryChange: () => void;
  onShowMetricsChange: () => void;
  onMemoryChange: (nodeId: string, memory: number) => void;
}

export function KnowledgeDetailPanel({
  selectedNode,
  selectedEdge,
  showMemory,
  showMetrics,
  onShowMemoryChange,
  onShowMetricsChange,
  onMemoryChange,
}: KnowledgeDetailPanelProps) {
  return (
    <aside className="right-panel">
      <div className="title">Properties</div>
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

function EdgeProperties({
  selectedEdge,
  showMemory,
  showMetrics,
}: {
  selectedEdge: KnowledgeGraphEdgeData;
  showMemory: boolean;
  showMetrics: boolean;
}) {
  const { stats } = selectedEdge;
  return (
    <div className="property-panel">
      <Value label="Type" value={selectedEdge.kind} />
      <Value label="Source" value={selectedEdge.source.name} />
      <Value label="Target" value={selectedEdge.target.name} />
      {showMemory && (
        <>
          <Value
            label="Required Memory"
            value={format(stats.requiredMemory)}
          />
          <Value
            label="Allocated Memory"
            value={format(stats.allocatedMemory)}
          />
        </>
      )}
      {showMetrics && (
        <>
          <Value
            label="Mastery"
            value={`${(stats.mastery * 100).toFixed(2)}%`}
          />
          <Value
            label="Effective Mastery"
            value={`${(stats.effectiveMastery * 100).toFixed(2)}%`}
          />
          <Value
            label="Overfit"
            value={`${stats.overfitPercent.toFixed(2)}%`}
          />
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
  const { stats } = selectedNode;
  return (
    <div className="property-panel">
      <Value label="Name" value={selectedNode.name} />
      <Value label="Neighbors" value={selectedNode.neighborCount} />
      <Value
        label="Data Split"
        value={`${stats.trainDataAmount}/${stats.valDataAmount}/${stats.testDataAmount}`}
      />
      {showMemory && (
        <>
          <Value label="Required Memory" value={format(stats.requiredMemory)} />
          <NumberField
            label="Allocated Memory"
            min={0}
            value={stats.allocatedMemory}
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
            value={format(stats.effectiveRequiredMemory)}
          />
          <Value
            label="Mastery"
            value={`${(stats.mastery * 100).toFixed(2)}%`}
          />
          <Value
            label="Overfit"
            value={`${stats.overfitPercent.toFixed(2)}%`}
          />
        </>
      )}
      <Value label="Train Loss" value={format(stats.trainLoss)} />
      <Value label="Val Loss" value={format(stats.valLoss)} />
    </div>
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
