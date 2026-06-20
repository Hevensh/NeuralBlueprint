import { useEffect, useMemo, useState } from 'react';
import {
  generateKnowledgeDatasets,
  splitEnabledKnowledgeDatasets,
  type DatasetSplitRatio,
} from './model/datasetSplit';
import { generateRandomKnowledgeGraph } from './model/graphGenerator';
import {
  loadKnowledgeNetworkState,
  saveKnowledgeNetworkState,
  type KnowledgeNetworkState,
} from './model/knowledgeStorage';
import { computeKnowledgeLossReport } from './model/lossMetrics';
import {
  calculateKnowledgeStats,
  createEmptyMasterGraph,
} from './model/masterGraph';
import {
  KnowledgeGraphControllerState,
  KnowledgeGraphControlsState,
  NetworkCapabilityState,
  TrainingConfigurationState,
} from './model/controlState';
import { estimateMasteryWithReasoningBudget } from './model/reasoning';
import { createTrainingRandomState } from './model/trainingSimulation';
import { buildKnowledgeGraphElements } from './buildKnowledgeGraphElements';
import type { KnowledgeGraphNodeData } from './KnowledgeGraphNodeTypes';
import { createKnowledgeGraphActions } from './knowledgeGraphActions';

const DEFAULT_DATASET_SPLIT_RATIO: DatasetSplitRatio = {
  train: 4,
  val: 1,
  test: 0,
};

function createInitialState(fileId: string): KnowledgeNetworkState {
  const saved = loadKnowledgeNetworkState(fileId);
  if (saved) return saved;

  const graphControls = KnowledgeGraphControlsState.defaults;
  const networkControls = NetworkCapabilityState.defaults;
  const trainingControls = TrainingConfigurationState.defaults;
  const graph = generateRandomKnowledgeGraph({
    seed: graphControls.generationSeed,
  });
  const master = createEmptyMasterGraph(
    graph,
    networkControls.memory,
    networkControls.reasoning,
  );

  return {
    graph,
    master,
    epoch: 0,
    lossHistory: [],
    datasetCollection: generateKnowledgeDatasets(
      graph,
      graphControls.datasetCount,
      graphControls.generationSeed,
      DEFAULT_DATASET_SPLIT_RATIO,
    ),
    generationSeed: graphControls.generationSeed,
    graphControls: graphControls.toStorage(),
    trainingControls: {
      learningRate: trainingControls.learningRate,
      regularizationRate: trainingControls.regularizationRate,
      trainSteps: trainingControls.trainSteps,
      initializationSeed: networkControls.initializationSeed,
    },
    trainingRandomState: createTrainingRandomState(
      networkControls.initializationSeed,
    ),
  };
}

export function useKnowledgeGraphController({ fileId }: { fileId: string }) {
  const [state, setState] = useState(() => createInitialState(fileId));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const controls = KnowledgeGraphControllerState.fromNetworkState(state);
  const stats = useMemo(
    () => calculateKnowledgeStats(state.graph, state.master),
    [state.graph, state.master],
  );
  const datasetSplit = useMemo(
    () => splitEnabledKnowledgeDatasets(
      state.graph,
      state.datasetCollection,
    ),
    [state.datasetCollection, state.graph],
  );
  const trainReasoning = useMemo(
    () => estimateMasteryWithReasoningBudget(
      state.graph,
      state.master,
      state.master.availableReasoningPoints,
      'train',
    ),
    [state.graph, state.master],
  );
  const validationReasoning = useMemo(
    () => estimateMasteryWithReasoningBudget(
      state.graph,
      state.master,
      state.master.availableReasoningPoints,
      'val',
    ),
    [state.graph, state.master],
  );
  const loss = useMemo(
    () => computeKnowledgeLossReport(
      state.graph,
      state.master,
      trainReasoning,
      validationReasoning,
      datasetSplit,
    ),
    [
      datasetSplit,
      state.graph,
      state.master,
      trainReasoning,
      validationReasoning,
    ],
  );
  const elements = useMemo(
    () => buildKnowledgeGraphElements(
      state.graph,
      state.master,
      trainReasoning,
      loss,
      datasetSplit,
    ),
    [datasetSplit, loss, state.graph, state.master, trainReasoning],
  );
  const selectedNode = useMemo<KnowledgeGraphNodeData | null>(
    () => elements.nodes.find((node) => node.id === selectedNodeId)?.data ?? null,
    [elements.nodes, selectedNodeId],
  );
  const actions = createKnowledgeGraphActions({
    controls,
    datasetSplit,
    setState,
    setSelectedNodeId,
  });

  useEffect(() => {
    const timer = window.setTimeout(
      () => saveKnowledgeNetworkState(fileId, state),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [fileId, state]);

  return {
    networkState: state,
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
      initializationSeed: controls.network.initializationSeed,
      onMemoryChange: actions.setAvailableMemoryPoints,
      onReasoningChange: actions.setAvailableReasoningPoints,
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
    setNodeMemory: actions.setNodeMemory,
  };
}

export type KnowledgeGraphController = ReturnType<
  typeof useKnowledgeGraphController
>;
