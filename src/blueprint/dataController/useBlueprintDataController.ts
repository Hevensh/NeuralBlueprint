import { useEffect, useMemo, useState } from 'react';
import type { InferenceMemoryProfile } from '../InferenceMemoryProfileTypes';
import { splitEnabledKnowledgeDatasets } from '../knowledgeGraph/model/datasetSplit';
import {
  loadKnowledgeGraphSession,
  saveKnowledgeGraphSession,
  type KnowledgeGraphSessionState,
} from '../../dataStorage/knowledgeGraphStorage';
import { computeKnowledgeLossReport } from '../knowledgeGraph/model/lossMetrics';
import {
  calculateKnowledgeStats,
  syncBlueprintMemoryProfile,
} from '../knowledgeGraph/model/memoryState';
import { createKnowledgeGraphSession } from '../../taskData/knowledgeGraphDefaults';
import { getTaskFileInitialState } from '../../taskData/fileInitialState';
import { getControllerControls } from './controlState';
import { estimateStagedMastery } from '../knowledgeGraph/model/reasoning';
import { buildKnowledgeGraphElements } from '../knowledgeGraph/buildKnowledgeGraphElements';
import type { KnowledgeGraphNodeData } from '../knowledgeGraph/KnowledgeGraphNodeTypes';
import { createBlueprintDataActions } from './blueprintDataActions';
import { estimateUtilityReport } from '../knowledgeGraph/model/utilityEstimate';

function createInitialState(fileId: string): KnowledgeGraphSessionState {
  const saved = loadKnowledgeGraphSession(fileId);
  if (saved) return saved;
  const initialState = getTaskFileInitialState(fileId)?.knowledgeGraph;
  return createKnowledgeGraphSession(
    initialState?.graphDefinition,
    initialState?.datasetCollection,
  );
}

export function useBlueprintDataController({
  fileId,
  inferenceMemoryProfile,
}: {
  fileId: string;
  inferenceMemoryProfile: InferenceMemoryProfile;
}) {
  const [state, setState] = useState(() => createInitialState(fileId));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const controls = getControllerControls(state);
  const stats = useMemo(
    () => calculateKnowledgeStats(state.graphDefinition, state.memory),
    [state.graphDefinition, state.memory],
  );
  const datasetSplit = useMemo(
    () => splitEnabledKnowledgeDatasets(
      state.graphDefinition,
      state.datasetCollection,
    ),
    [state.datasetCollection, state.graphDefinition],
  );
  const trainReasoning = useMemo(
    () => estimateStagedMastery(
      state.graphDefinition,
      state.memory,
      'train',
    ),
    [state.graphDefinition, state.memory],
  );
  const validationReasoning = useMemo(
    () => estimateStagedMastery(
      state.graphDefinition,
      state.memory,
      'val',
    ),
    [state.graphDefinition, state.memory],
  );
  const utilities = useMemo(
    () => estimateUtilityReport(
      state.graphDefinition,
      trainReasoning,
      datasetSplit,
    ),
    [
      datasetSplit,
      state.graphDefinition,
      trainReasoning,
    ],
  );
  const loss = useMemo(
    () => computeKnowledgeLossReport(
      state.graphDefinition,
      state.memory,
      trainReasoning,
      validationReasoning,
      datasetSplit,
    ),
    [
      datasetSplit,
      state.graphDefinition,
      state.memory,
      trainReasoning,
      validationReasoning,
    ],
  );
  const elements = useMemo(
    () => buildKnowledgeGraphElements(
      state.graphDefinition,
      state.memory,
      trainReasoning,
      validationReasoning,
      loss,
      datasetSplit,
      utilities,
    ),
    [
      datasetSplit,
      loss,
      utilities,
      state.graphDefinition,
      state.memory,
      trainReasoning,
      validationReasoning,
    ],
  );
  const selectedNode = useMemo<KnowledgeGraphNodeData | null>(
    () => elements.nodes.find((node) => node.id === selectedNodeId)?.data ?? null,
    [elements.nodes, selectedNodeId],
  );
  const actions = createBlueprintDataActions({
    controls,
    datasetSplit,
    setState,
    setSelectedNodeId,
    inferenceMemoryProfile,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState((current) => {
        const memory = syncBlueprintMemoryProfile(
          current.graphDefinition,
          current.memory,
          inferenceMemoryProfile,
        );
        return memory === current.memory
          ? current
          : {
              ...current,
              memory,
              epoch: 0,
              lossHistory: [],
              modelInitialized: false,
            };
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [inferenceMemoryProfile]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => saveKnowledgeGraphSession(fileId, state),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [fileId, state]);

  return {
    elements,
    selectedNode,
    selectNode: setSelectedNodeId,
    viewport: state.viewport,
    setViewport: actions.setGraphViewport,
    graphControls: {
      minNodes: controls.graph.minNodes,
      maxNodes: controls.graph.maxNodes,
      datasetCount: controls.graph.datasetCount,
      seed: controls.graph.generationSeed,
      onMinNodesChange: (value: number) => (
        actions.updateGraphControls({ minNodes: value })
      ),
      onMaxNodesChange: (value: number) => (
        actions.updateGraphControls({ maxNodes: value })
      ),
      onDatasetCountChange: (value: number) => (
        actions.updateGraphControls({ datasetCount: value })
      ),
      onSeedChange: (value: string) => (
        actions.updateGraphControls({ generationSeed: value })
      ),
      onGenerate: actions.regenerateGraph,
      onReset: actions.resetKnowledgeGraphControls,
    },
    networkControls: {
      memory: controls.network.memory,
      reasoning: controls.network.reasoning,
      memoryProfileSource: state.memory.memoryProfileSource,
      hasBlueprintProfile: inferenceMemoryProfile.groups.length > 0,
      initializationSeed: controls.network.initializationSeed,
      onMemoryChange: actions.setAvailableMemoryPoints,
      onReasoningChange: actions.setAvailableReasoningPoints,
      onMemoryProfileSourceChange: actions.selectMemoryProfileSource,
      onInitializationSeedChange: (value: string) => (
        actions.updateTrainingControls({ initializationSeed: value })
      ),
      onInitialize: actions.initializeNeuralMemory,
      onReset: actions.resetNetworkCapability,
    },
    trainingControls: {
      learningRate: controls.training.learningRate,
      regularizationRate: controls.training.regularizationRate,
      trainSteps: controls.training.trainSteps,
      trainDisabled: !state.modelInitialized,
      onLearningRateChange: (value: number) => (
        actions.updateTrainingControls({ learningRate: value })
      ),
      onRegularizationRateChange: (value: number) => (
        actions.updateTrainingControls({ regularizationRate: value })
      ),
      onTrainStepsChange: (value: number) => (
        actions.updateTrainingControls({ trainSteps: value })
      ),
      onTrain: actions.runTrainingStep,
      onTransfer: actions.applyTransferAllocation,
      onPerfect: actions.applyPerfectAllocation,
      onReset: actions.resetTrainingControls,
    },
    statistics: {
      stats,
      loss,
      dataset: datasetSplit,
      epoch: state.epoch,
    },
    datasets: {
      collection: state.datasetCollection,
      onEnabledChange: actions.setDatasetEnabled,
      onSeedChange: actions.setDatasetSeed,
      onSplitRatioChange: actions.setDatasetSplitRatio,
    },
    lossHistory: state.lossHistory,
    inferenceStage: {
      value: state.memory.selectedInferenceStage,
      max: state.memory.availableReasoningPoints,
      onChange: actions.selectInferenceStage,
    },
    setNodeMemory: actions.setNodeMemory,
    setEdgeMemory: actions.setEdgeMemory,
  };
}

export type BlueprintDataController = ReturnType<
  typeof useBlueprintDataController
>;
