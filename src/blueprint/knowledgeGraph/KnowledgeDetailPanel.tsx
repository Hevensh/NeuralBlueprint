import { NumberField } from '../../NumberField';
import { useLabels } from '../../i18n/LanguageContext';
import type {
  KnowledgeGraphEdgeData,
  KnowledgeGraphNodeData,
} from './KnowledgeGraphNodeTypes';
import { formatTrainingSignal } from './formatTrainingSignal';
import {
  KnowledgeAdaptationProperties,
  type AdaptationChange,
} from './KnowledgeAdaptationProperties';

interface KnowledgeDetailPanelProps {
  selectedNode: KnowledgeGraphNodeData | null;
  selectedEdge: KnowledgeGraphEdgeData | null;
  inferenceStage: number;
  maxInferenceStage: number;
  enableMemoryAnalysis: boolean;
  enableMasteryOverfitAnalysis: boolean;
  enableUtilityAnalysis: boolean;
  showMemory: boolean;
  showMetrics: boolean;
  showUtility: boolean;
  showReceptiveField: boolean;
  showDistanceIndex: boolean;
  onShowMemoryChange: () => void;
  onShowMetricsChange: () => void;
  onShowUtilityChange: () => void;
  onShowReceptiveFieldChange: () => void;
  onShowDistanceIndexChange: () => void;
  onMemoryChange: (nodeId: string, memory: number) => void;
  onEdgeMemoryChange: (edgeId: string, memory: number) => void;
  onNodeAdaptationRequirementChange: AdaptationChange;
  onEdgeAdaptationRequirementChange: AdaptationChange;
  onInferenceStageChange: (stage: number) => void;
}

export function KnowledgeDetailPanel({
  selectedNode,
  selectedEdge,
  inferenceStage,
  maxInferenceStage,
  enableMemoryAnalysis,
  enableMasteryOverfitAnalysis,
  enableUtilityAnalysis,
  showMemory,
  showMetrics,
  showUtility,
  showReceptiveField,
  showDistanceIndex,
  onShowMemoryChange,
  onShowMetricsChange,
  onShowUtilityChange,
  onShowReceptiveFieldChange,
  onShowDistanceIndexChange,
  onMemoryChange,
  onEdgeMemoryChange,
  onNodeAdaptationRequirementChange,
  onEdgeAdaptationRequirementChange,
  onInferenceStageChange,
}: KnowledgeDetailPanelProps) {
  const labels = useLabels().knowledgeGraph.detail;

  return (
    <aside className="right-panel">
      <div className="title">{labels.properties}</div>
      {enableMemoryAnalysis && (
        <InferenceStageSlider
          max={maxInferenceStage}
          value={inferenceStage}
          onChange={onInferenceStageChange}
        />
      )}
      <div className="property-toggle-group">
        {enableMemoryAnalysis && (
          <AnalysisToggle
            active={showMemory}
            label={labels.memoryAllocation}
            onChange={onShowMemoryChange}
          />
        )}
        {enableMasteryOverfitAnalysis && (
          <AnalysisToggle
            active={showMetrics}
            label={labels.masteryOverfit}
            onChange={onShowMetricsChange}
          />
        )}
        {enableUtilityAnalysis && (
          <AnalysisToggle
            active={showUtility}
            label={labels.utility}
            onChange={onShowUtilityChange}
          />
        )}
        <AnalysisToggle
          active={showReceptiveField}
          label={labels.receptiveFieldAnalysis}
          onChange={onShowReceptiveFieldChange}
        />
        <AnalysisToggle
          active={showDistanceIndex}
          label={labels.distanceIndexAnalysis}
          onChange={onShowDistanceIndexChange}
        />
      </div>
      {selectedEdge
        ? (
          <EdgeProperties
            selectedEdge={selectedEdge}
            showMemory={showMemory}
            showMetrics={showMetrics}
            showUtility={showUtility}
            showReceptiveField={showReceptiveField}
            showDistanceIndex={showDistanceIndex}
            onMemoryChange={onEdgeMemoryChange}
            onAdaptationRequirementChange={onEdgeAdaptationRequirementChange}
          />
        )
        : selectedNode
          ? (
            <NodeProperties
              selectedNode={selectedNode}
              showMemory={showMemory}
              showMetrics={showMetrics}
              showUtility={showUtility}
              showReceptiveField={showReceptiveField}
              showDistanceIndex={showDistanceIndex}
              onMemoryChange={onMemoryChange}
              onAdaptationRequirementChange={onNodeAdaptationRequirementChange}
            />
          )
          : <div className="property-empty">{labels.noElementSelected}</div>}
    </aside>
  );
}

function AnalysisToggle({
  active,
  label,
  onChange,
}: {
  active: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`toggle-button ${active ? 'active' : ''}`}
      onClick={onChange}
      type="button"
    >
      {label}
    </button>
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
  const labels = useLabels().knowledgeGraph.detail;

  return (
    <div className="knowledge-stage-control">
      <div className="knowledge-stage-header">
        <span>{labels.inferenceStage}</span>
        <strong>{value} / {max}</strong>
      </div>
      <input
        aria-label={labels.inferenceStage}
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
  showUtility,
  showReceptiveField,
  showDistanceIndex,
  onMemoryChange,
  onAdaptationRequirementChange,
}: {
  selectedEdge: KnowledgeGraphEdgeData;
  showMemory: boolean;
  showMetrics: boolean;
  showUtility: boolean;
  showReceptiveField: boolean;
  showDistanceIndex: boolean;
  onMemoryChange: (edgeId: string, memory: number) => void;
  onAdaptationRequirementChange: AdaptationChange;
}) {
  const labels = useLabels().knowledgeGraph.detail;
  const { metrics } = selectedEdge;

  return (
    <div className="property-panel">
      <Value label={labels.type} value={selectedEdge.kind} />
      <Value label={labels.source} value={selectedEdge.source.name} />
      <Value label={labels.target} value={selectedEdge.target.name} />
      <Value label={labels.lambda} value={format(selectedEdge.properties.lambda)} />
      {showMemory && (
        <>
          <Value
            label={labels.requiredMemory}
            value={format(selectedEdge.properties.requiredMemory)}
          />
          <NumberField
            label={`${labels.allocatedMemory} (${selectedEdge.memorySelectionLabel})`}
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
            label={labels.mastery}
            value={`${(metrics.mastery * 100).toFixed(2)}%`}
          />
          <Value
            label={labels.effectiveMastery}
            value={`${(metrics.effectiveMastery * 100).toFixed(2)}%`}
          />
          <Value
            label={labels.overfit}
            value={`${metrics.overfitPercent.toFixed(2)}%`}
          />
        </>
      )}
      {showUtility && <TrainingProperties training={metrics.training} />}
      <KnowledgeAdaptationProperties
        entityId={selectedEdge.id}
        requirements={selectedEdge.properties.adaptationRequirements}
        showDistanceIndex={showDistanceIndex}
        showReceptiveField={showReceptiveField}
        onRequirementChange={onAdaptationRequirementChange}
      />
    </div>
  );
}

function NodeProperties({
  selectedNode,
  showMemory,
  showMetrics,
  showUtility,
  showReceptiveField,
  showDistanceIndex,
  onMemoryChange,
  onAdaptationRequirementChange,
}: {
  selectedNode: KnowledgeGraphNodeData;
  showMemory: boolean;
  showMetrics: boolean;
  showUtility: boolean;
  showReceptiveField: boolean;
  showDistanceIndex: boolean;
  onMemoryChange: (nodeId: string, memory: number) => void;
  onAdaptationRequirementChange: AdaptationChange;
}) {
  const labels = useLabels().knowledgeGraph.detail;
  const { metrics } = selectedNode;

  return (
    <div className="property-panel">
      <Value label={labels.name} value={selectedNode.name} />
      <Value label={labels.neighbors} value={selectedNode.neighborCount} />
      <Value
        label={labels.dataSplit}
        value={`${metrics.trainDataAmount}/${metrics.valDataAmount}/${metrics.testDataAmount}`}
      />
      {showMemory && (
        <>
          <Value
            label={labels.requiredMemory}
            value={format(selectedNode.properties.requiredMemory)}
          />
          <NumberField
            label={`${labels.allocatedMemory} (${selectedNode.memorySelectionLabel})`}
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
            label={labels.effectiveMemory}
            value={format(metrics.effectiveRequiredMemory)}
          />
          <Value
            label={labels.mastery}
            value={`${(metrics.mastery * 100).toFixed(2)}%`}
          />
          <Value
            label={labels.overfit}
            value={`${metrics.overfitPercent.toFixed(2)}%`}
          />
        </>
      )}
      {showUtility && <TrainingProperties training={metrics.training} />}
      <KnowledgeAdaptationProperties
        entityId={selectedNode.id}
        requirements={selectedNode.properties.adaptationRequirements}
        showDistanceIndex={showDistanceIndex}
        showReceptiveField={showReceptiveField}
        onRequirementChange={onAdaptationRequirementChange}
      />
      <Value label={labels.trainLoss} value={format(metrics.trainLoss)} />
      <Value label={labels.valLoss} value={format(metrics.valLoss)} />
    </div>
  );
}

function TrainingProperties({
  training,
}: {
  training: KnowledgeGraphNodeData['metrics']['training'];
}) {
  const labels = useLabels().knowledgeGraph.detail;

  return (
    <>
      <Value
        label={labels.selfGrowth}
        value={formatTrainingSignal(training.self)}
      />
      <Value
        label={labels.adjacentGrowth}
        value={formatTrainingSignal(training.adjacent)}
      />
      <Value
        label={labels.stageUtility}
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
