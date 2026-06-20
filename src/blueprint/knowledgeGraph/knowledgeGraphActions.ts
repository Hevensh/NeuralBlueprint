import type { Dispatch, SetStateAction } from 'react';
import type { DatasetSplitResult, DatasetSplitRatio } from './model/datasetSplit';
import {
  generateKnowledgeDatasets,
} from './model/datasetSplit';
import { generateRandomKnowledgeGraph } from './model/graphGenerator';
import type {
  KnowledgeGraphViewport,
  KnowledgeNetworkState,
} from './model/knowledgeStorage';
import {
  KnowledgeGraphControllerState,
  KnowledgeGraphControlsState,
  NetworkCapabilityState,
  TrainingConfigurationState,
} from './model/controlState';
import { createEmptyMasterGraph, updateOwnMasteries } from './model/masterGraph';
import {
  evaluateAllocation,
  initializeAllocation,
  perfectAllocation,
  transferAllocation,
} from './model/allocationStrategies';
import {
  createTrainingRandomState,
  runTrainingSimulation,
} from './model/trainingSimulation';

const DEFAULT_DATASET_SPLIT_RATIO: DatasetSplitRatio = {
  train: 4,
  val: 1,
  test: 0,
};

type KnowledgeGraphActionsOptions = {
  controls: KnowledgeGraphControllerState;
  datasetSplit: DatasetSplitResult;
  setState: Dispatch<SetStateAction<KnowledgeNetworkState>>;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
};

export function createKnowledgeGraphActions({
  controls,
  datasetSplit,
  setState,
  setSelectedNodeId,
}: KnowledgeGraphActionsOptions) {
  const updateTrainingControls = (
    patch: Partial<NonNullable<KnowledgeNetworkState['trainingControls']>>,
  ) => {
    setState((current) => {
      const currentControls = KnowledgeGraphControllerState.fromNetworkState(
        current,
      );
      const nextTraining = currentControls.training.with(patch);
      return {
        ...current,
        trainingControls: {
          learningRate: nextTraining.learningRate,
          regularizationRate: nextTraining.regularizationRate,
          trainSteps: nextTraining.trainSteps,
          initializationSeed: patch.initializationSeed
            ?? currentControls.network.initializationSeed,
        },
      };
    });
  };

  const updateGraphControls = (
    patch: Partial<NonNullable<KnowledgeNetworkState['graphControls']>>,
  ) => {
    setState((current) => {
      const nextControls = KnowledgeGraphControlsState
        .fromNetworkState(current)
        .with(patch);
      return {
        ...current,
        graphControls: nextControls.toStorage(),
        generationSeed: nextControls.generationSeed,
      };
    });
  };

  const resetTrainingControls = () => {
    updateTrainingControls(TrainingConfigurationState.defaults);
  };

  const resetKnowledgeGraphControls = () => {
    updateGraphControls(KnowledgeGraphControlsState.defaults.toStorage());
  };

  const resetNetworkCapability = () => {
    const defaults = NetworkCapabilityState.defaults;
    setState((current) => ({
      ...current,
      master: {
        ...current.master,
        availableMemoryPoints: defaults.memory,
        availableReasoningPoints: defaults.reasoning,
      },
      trainingControls: {
        ...current.trainingControls,
        learningRate: controls.training.learningRate,
        regularizationRate: controls.training.regularizationRate,
        trainSteps: controls.training.trainSteps,
        initializationSeed: defaults.initializationSeed,
      },
    }));
  };

  const regenerateGraph = () => {
    const graph = generateRandomKnowledgeGraph({
      minNodes: controls.graph.minNodes,
      maxNodes: controls.graph.maxNodes,
      seed: controls.graph.generationSeed,
    });
    const datasetCollection = generateKnowledgeDatasets(
      graph,
      controls.graph.datasetCount,
      controls.graph.generationSeed,
      DEFAULT_DATASET_SPLIT_RATIO,
    );
    setState((current) => ({
      ...current,
      graph,
      master: createEmptyMasterGraph(
        graph,
        current.master.availableMemoryPoints,
        current.master.availableReasoningPoints,
      ),
      epoch: 0,
      lossHistory: [],
      initialization: undefined,
      viewport: undefined,
      datasetCollection,
      generationSeed: controls.graph.generationSeed,
      graphControls: controls.graph.toStorage(),
      trainingRandomState: createTrainingRandomState(
        controls.network.initializationSeed,
      ),
    }));
    setSelectedNodeId(null);
  };

  const setAvailableMemoryPoints = (availableMemoryPoints: number) => {
    setState((current) => ({
      ...current,
      master: { ...current.master, availableMemoryPoints },
    }));
  };

  const setAvailableReasoningPoints = (availableReasoningPoints: number) => {
    setState((current) => ({
      ...current,
      master: { ...current.master, availableReasoningPoints },
    }));
  };

  const setDatasetEnabled = (datasetId: string, enabled: boolean) => {
    setState((current) => ({
      ...current,
      epoch: 0,
      lossHistory: [],
      datasetCollection: {
        ...current.datasetCollection,
        datasets: current.datasetCollection.datasets.map((dataset) => (
          dataset.id === datasetId ? { ...dataset, enabled } : dataset
        )),
      },
    }));
  };

  const setDatasetSplitRatio = (
    datasetId: string,
    splitRatio: DatasetSplitRatio,
  ) => {
    setState((current) => ({
      ...current,
      epoch: 0,
      lossHistory: [],
      datasetCollection: {
        ...current.datasetCollection,
        datasets: current.datasetCollection.datasets.map((dataset) => (
          dataset.id === datasetId
            ? {
                ...dataset,
                splitRatio: {
                  train: Math.max(0, splitRatio.train),
                  val: Math.max(0, splitRatio.val),
                  test: Math.max(0, splitRatio.test),
                },
              }
            : dataset
        )),
      },
    }));
  };

  const setDatasetSeed = (datasetId: string, seed: string) => {
    setState((current) => ({
      ...current,
      epoch: 0,
      lossHistory: [],
      datasetCollection: {
        ...current.datasetCollection,
        datasets: current.datasetCollection.datasets.map((dataset) => (
          dataset.id === datasetId ? { ...dataset, seed } : dataset
        )),
      },
    }));
  };

  const setNodeMemory = (nodeId: string, memory: number) => {
    setState((current) => {
      const nextMaster = {
        ...current.master,
        nodes: {
          ...current.master.nodes,
          [nodeId]: { ...current.master.nodes[nodeId], memory },
        },
      };
      return {
        ...current,
        master: updateOwnMasteries(current.graph, nextMaster),
      };
    });
  };

  const setGraphViewport = (viewport: KnowledgeGraphViewport) => {
    setState((current) => ({ ...current, viewport }));
  };

  const stabilityPercent = () => Math.max(
    0,
    Math.min(100, 15 + 2.5 * controls.training.learningRate),
  );

  const initializeNeuralMemory = () => {
    setState((current) => {
      const stability = stabilityPercent();
      const nextMaster = initializeAllocation(
        current.graph,
        current.master,
        controls.network.initializationSeed,
        stability,
      );
      const loss = evaluateAllocation(current.graph, nextMaster, datasetSplit);
      const initializationSeed = controls.network.initializationSeed.trim();
      return {
        ...current,
        master: nextMaster,
        epoch: 0,
        initialization: {
          availableMemoryPoints: current.master.availableMemoryPoints,
          availableReasoningPoints: current.master.availableReasoningPoints,
          modelStabilityPercent: stability,
          learningRate: controls.training.learningRate,
          regularizationRate: controls.training.regularizationRate,
          ...(initializationSeed ? { initializationSeed } : {}),
        },
        trainingRandomState: createTrainingRandomState(
          initializationSeed
            || NetworkCapabilityState.defaults.initializationSeed,
        ),
        lossHistory: [{
          epoch: 0,
          trainLoss: loss.graphTrainLoss,
          valLoss: loss.graphValLoss,
        }],
      };
    });
  };

  const runTrainingStep = () => {
    setState((current) => {
      const result = runTrainingSimulation(
        current.graph,
        current.master,
        current.epoch,
        current.lossHistory,
        {
          learningRate: controls.training.learningRate,
          regularizationRate: controls.training.regularizationRate,
          steps: controls.training.trainSteps,
          datasetCollection: current.datasetCollection,
          trainingRandomState: current.trainingRandomState,
        },
      );
      return {
        ...current,
        master: result.master,
        epoch: result.epoch,
        lossHistory: result.lossHistory,
        trainingRandomState: result.trainingRandomState,
      };
    });
  };

  const applyAllocation = (
    allocate: (
      graph: KnowledgeNetworkState['graph'],
      master: KnowledgeNetworkState['master'],
    ) => KnowledgeNetworkState['master'],
  ) => {
    setState((current) => {
      const nextMaster = allocate(current.graph, current.master);
      const loss = evaluateAllocation(current.graph, nextMaster, datasetSplit);
      const epoch = current.epoch;
      return {
        ...current,
        master: nextMaster,
        lossHistory: [
          ...current.lossHistory,
          {
            epoch,
            trainLoss: loss.graphTrainLoss,
            valLoss: loss.graphValLoss,
          },
        ].slice(-80),
      };
    });
  };

  return {
    updateGraphControls,
    updateTrainingControls,
    resetTrainingControls,
    resetKnowledgeGraphControls,
    resetNetworkCapability,
    regenerateGraph,
    setAvailableMemoryPoints,
    setAvailableReasoningPoints,
    setDatasetEnabled,
    setDatasetSeed,
    setDatasetSplitRatio,
    setNodeMemory,
    setGraphViewport,
    initializeNeuralMemory,
    runTrainingStep,
    applyPerfectAllocation: () => applyAllocation(perfectAllocation),
    applyTransferAllocation: () => applyAllocation((graph, master) => (
      transferAllocation(
        graph,
        master,
        controls.network.initializationSeed,
        stabilityPercent(),
      )
    )),
  };
}
