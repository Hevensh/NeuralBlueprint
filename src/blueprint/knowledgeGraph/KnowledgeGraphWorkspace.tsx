import { useState } from 'react';
import type { ResolvedBlueprintTaskFeatureConfig } from '../../taskData/blueprintFeatureConfig';
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
  features,
  showMemoryReasoningControls = true,
}: {
  controller: BlueprintDataController;
  features: ResolvedBlueprintTaskFeatureConfig['knowledgeGraph'];
  showMemoryReasoningControls?: boolean;
}) {
  const {
    showMemory,
    showMetrics,
    showUtility,
    showScale,
    showIndex,
  } = controller.analysisPreview;
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [previewDataset, setPreviewDataset] =
    useState<KnowledgeDataset | null>(null);
  const [selectedDataset, setSelectedDataset] =
    useState<KnowledgeDataset | null>(null);
  const selectedEdge = controller.elements.edges.all
    .find((edge) => edge.id === selectedEdgeId)?.data ?? null;
  const enableMemoryAnalysis = features.enableMemoryAnalysis;
  const enableMasteryOverfitAnalysis =
    enableMemoryAnalysis && features.enableMasteryOverfitAnalysis;
  const enableUtilityAnalysis = features.enableUtilityAnalysis;
  const showMemoryPreview = enableMemoryAnalysis && showMemory;
  const showMetricPreview = enableMasteryOverfitAnalysis && showMetrics;
  const showUtilityPreview = enableUtilityAnalysis && showUtility;
  const showGlobalDebugPreview = features.enableGlobalDebugPreview;
  const toggleMetrics = () => {
    controller.setAnalysisPreview({
      ...(!showMetrics && enableMemoryAnalysis ? { showMemory: true } : {}),
      showMetrics: !showMetrics,
    });
  };

  return (
    <>
      <aside className="left-panel">
        {features.showKnowledgeGraphControls && (
          <KnowledgeGraphControls {...controller.graphControls} />
        )}
        <NetworkCapabilityControls
          {...controller.networkControls}
          mode={features.networkCapabilityMode}
          showMemoryReasoningControls={showMemoryReasoningControls}
        />
        <TrainingConfigurationControls
          {...controller.trainingControls}
          showAllocationButtons={features.showAllocationButtons
            && !controller.statistics.pretraining}
        />
        <CurrentStatistics {...controller.statistics} />
      </aside>

      <KnowledgeGraphView
        nodes={controller.elements.nodes}
        edges={controller.elements.edges.all}
        selectedNodeId={controller.selectedNode?.id ?? null}
        selectedEdgeId={selectedEdgeId}
        showMemoryPreview={showMemoryPreview}
        showMetricPreview={showMetricPreview}
        showUtilityPreview={showUtilityPreview}
        showScalePreview={showScale}
        showIndexPreview={showIndex}
        showGlobalDebugPreview={showGlobalDebugPreview}
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
        enableMemoryAnalysis={enableMemoryAnalysis}
        enableMasteryOverfitAnalysis={enableMasteryOverfitAnalysis}
        enableUtilityAnalysis={enableUtilityAnalysis}
        showMemory={showMemoryPreview}
        showMetrics={showMetricPreview}
        showUtility={showUtilityPreview}
        showScale={showScale}
        showIndex={showIndex}
        onShowMemoryChange={() => controller.setAnalysisPreview({
          showMemory: !showMemory,
        })}
        onShowMetricsChange={toggleMetrics}
        onShowUtilityChange={() => controller.setAnalysisPreview({
          showUtility: !showUtility,
        })}
        onShowScaleChange={() => controller.setAnalysisPreview({
          showScale: !showScale,
        })}
        onShowIndexChange={() => controller.setAnalysisPreview({
          showIndex: !showIndex,
        })}
        onMemoryChange={controller.setNodeMemory}
        onEdgeMemoryChange={controller.setEdgeMemory}
        onNodeAdaptationRequirementChange={
          controller.setNodeAdaptationRequirement
        }
        onEdgeAdaptationRequirementChange={
          controller.setEdgeAdaptationRequirement
        }
        onNodeAdaptationAxisChange={controller.setNodeAdaptationAxis}
        onEdgeAdaptationAxisChange={controller.setEdgeAdaptationAxis}
        onInferenceStageChange={controller.inferenceStage.onChange}
      />
    </>
  );
}
