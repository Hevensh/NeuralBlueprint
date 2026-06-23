import { useState } from 'react';
import { CurrentStatistics } from '../dataController/controls/CurrentStatistics';
import { KnowledgeGraphControls } from '../dataController/controls/KnowledgeGraphControls';
import { NetworkCapabilityControls } from '../dataController/controls/NetworkCapabilityControls';
import { TrainingConfigurationControls } from '../dataController/controls/TrainingConfigurationControls';
import type { BlueprintDataController } from '../dataController/useBlueprintDataController';
import { KnowledgeDetailPanel } from './KnowledgeDetailPanel';
import { KnowledgeDatasetSelector } from './KnowledgeDatasetSelector';
import { KnowledgeGraphView } from './KnowledgeGraphView';
import type { KnowledgeDataset } from './model/datasetSplit';
import './knowledgeGraph.css';

export function KnowledgeGraphWorkspace({
  controller,
}: {
  controller: BlueprintDataController;
}) {
  const [showMemory, setShowMemory] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [previewDataset, setPreviewDataset] =
    useState<KnowledgeDataset | null>(null);
  const [selectedDataset, setSelectedDataset] =
    useState<KnowledgeDataset | null>(null);
  const selectedEdge = controller.elements.edges.all
    .find((edge) => edge.id === selectedEdgeId)?.data ?? null;
  const toggleMetrics = () => {
    if (!showMetrics) setShowMemory(true);
    setShowMetrics((current) => !current);
  };

  return (
    <>
      <aside className="left-panel">
        <KnowledgeGraphControls {...controller.graphControls} />
        <NetworkCapabilityControls {...controller.networkControls} />
        <TrainingConfigurationControls {...controller.trainingControls} />
        <CurrentStatistics {...controller.statistics} />
      </aside>

      <KnowledgeGraphView
        nodes={controller.elements.nodes}
        edges={controller.elements.edges.all}
        selectedNodeId={controller.selectedNode?.id ?? null}
        selectedEdgeId={selectedEdgeId}
        showMemoryPreview={showMemory}
        showMetricPreview={showMetrics}
        previewDataset={previewDataset ?? selectedDataset}
        topOverlay={(
          <KnowledgeDatasetSelector
            collection={controller.datasets.collection}
            onEnabledChange={controller.datasets.onEnabledChange}
            onPreviewChange={setPreviewDataset}
            onSelectionChange={setSelectedDataset}
            onSeedChange={controller.datasets.onSeedChange}
            onSplitRatioChange={controller.datasets.onSplitRatioChange}
          />
        )}
        lossHistory={controller.lossHistory}
        viewport={controller.viewport}
        onNodeSelect={(node) => controller.selectNode(node?.id ?? null)}
        onEdgeSelect={(edge) => setSelectedEdgeId(edge?.id ?? null)}
        onViewportChange={controller.setViewport}
      />

      <KnowledgeDetailPanel
        selectedNode={controller.selectedNode}
        selectedEdge={selectedEdge}
        inferenceStage={controller.inferenceStage.value}
        maxInferenceStage={controller.inferenceStage.max}
        showMemory={showMemory}
        showMetrics={showMetrics}
        onShowMemoryChange={() => setShowMemory((current) => !current)}
        onShowMetricsChange={toggleMetrics}
        onMemoryChange={controller.setNodeMemory}
        onEdgeMemoryChange={controller.setEdgeMemory}
        onInferenceStageChange={controller.inferenceStage.onChange}
      />
    </>
  );
}
