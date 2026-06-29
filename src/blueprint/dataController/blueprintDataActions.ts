import type { Dispatch, SetStateAction } from 'react';
import {
  getInferenceMemoryProfileSignature,
  type InferenceMemoryProfile,
} from '../InferenceMemoryProfileTypes';
import type {
  DatasetSplitResult,
  DatasetSplitRatio,
  KnowledgeDataset,
} from '../knowledgeGraph/model/datasetSplit';
import {
  generateKnowledgeDatasets,
} from '../knowledgeGraph/model/datasetSplit';
import { generateRandomKnowledgeGraph } from '../knowledgeGraph/model/graphGenerator';
import type {
  KnowledgeGraphViewport,
  KnowledgeGraphSessionState,
} from '../../dataStorage/knowledgeGraphStorage';
import {
  DEFAULT_GRAPH_CONTROLS,
  DEFAULT_DATASET_SPLIT_RATIO,
  DEFAULT_NETWORK_CAPABILITY,
  DEFAULT_TRAINING_CONTROLS,
} from '../../taskData/knowledgeGraphDefaults';
import {
  mergeGraphControls,
  mergeTrainingControls,
  type BlueprintControllerControls,
} from './controlState';
import {
  cloneKnowledgeGraphMemory,
  configurePresetMemoryProfile,
  createKnowledgeGraphMemory,
  setMemoryProfileSource,
  setSelectedInferenceStage,
} from '../knowledgeGraph/model/memoryState';
import {
  writeEntityMemory,
} from '../knowledgeGraph/model/memoryOperations';
import {
  evaluateAllocation,
  initializeAllocation,
  perfectAllocation,
  transferAllocation,
} from '../knowledgeGraph/model/allocationStrategies';
import {
  createTrainingRandomState,
  runTrainingSimulation,
} from '../knowledgeGraph/model/trainingSimulation';

type BlueprintDataActionsOptions = {
  controls: BlueprintControllerControls;
  datasetSplit: DatasetSplitResult;
  setState: Dispatch<SetStateAction<KnowledgeGraphSessionState>>;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
  inferenceMemoryProfile: InferenceMemoryProfile;
};

function requireNetworkReinitialize(
  state: KnowledgeGraphSessionState,
): KnowledgeGraphSessionState {
  return {
    ...state,
    epoch: 0,
    lossHistory: [],
    modelInitialized: false,
  };
}

export function createBlueprintDataActions({
  controls,
  datasetSplit,
  setState,
  setSelectedNodeId,
  inferenceMemoryProfile,
}: BlueprintDataActionsOptions) {
  const updateTrainingControls = (
    patch: Partial<NonNullable<KnowledgeGraphSessionState['trainingControls']>>,
  ) => {
    setState((current) => {
      const next = {
        ...current,
        trainingControls: mergeTrainingControls(
          current.trainingControls,
          patch,
        ),
      };
      return patch.initializationSeed === undefined
        ? next
        : requireNetworkReinitialize(next);
    });
  };

  const updateGraphControls = (
    patch: Partial<NonNullable<KnowledgeGraphSessionState['graphControls']>>,
  ) => {
    setState((current) => {
      const graphControls = mergeGraphControls(current.graphControls, patch);
      return {
        ...current,
        graphControls,
      };
    });
  };

  const resetTrainingControls = () => {
    updateTrainingControls(DEFAULT_TRAINING_CONTROLS);
  };

  const resetKnowledgeGraphControls = () => {
    updateGraphControls(DEFAULT_GRAPH_CONTROLS);
  };

  const resetNetworkCapability = () => {
    const defaults = DEFAULT_NETWORK_CAPABILITY;
    setState((current) => requireNetworkReinitialize({
      ...current,
      memory: setMemoryProfileSource(
        current.graphDefinition,
        configurePresetMemoryProfile(
          current.graphDefinition,
          current.memory,
          defaults.memory,
          defaults.reasoning,
        ),
        'preset',
        inferenceMemoryProfile,
      ),
      trainingControls: {
        ...current.trainingControls,
        initializationSeed: defaults.initializationSeed,
      },
    }));
  };

  const regenerateGraph = () => {
    const graphDefinition = generateRandomKnowledgeGraph({
      minNodes: controls.graph.minNodes,
      maxNodes: controls.graph.maxNodes,
      seed: controls.graph.generationSeed,
    });
    const datasetCollection = generateKnowledgeDatasets(
      graphDefinition,
      controls.graph.datasetCount,
      controls.graph.generationSeed,
      DEFAULT_DATASET_SPLIT_RATIO,
    );
    setState((current) => {
      const emptyMemory = createKnowledgeGraphMemory(
        graphDefinition,
        current.memory.presetMemoryPoints,
        current.memory.presetReasoningPoints,
      );
      return {
        ...current,
        graphDefinition,
        memory: setMemoryProfileSource(
          graphDefinition,
          emptyMemory,
          current.memory.memoryProfileSource,
          inferenceMemoryProfile,
        ),
        epoch: 0,
        lossHistory: [],
        viewport: undefined,
        datasetCollection,
        graphControls: controls.graph,
        trainingRandomState: createTrainingRandomState(
          controls.network.initializationSeed,
        ),
        modelInitialized: false,
      };
    });
    setSelectedNodeId(null);
  };

  const setAvailableMemoryPoints = (availableMemoryPoints: number) => {
    setState((current) => requireNetworkReinitialize({
      ...current,
      memory: configurePresetMemoryProfile(
        current.graphDefinition,
        current.memory,
        availableMemoryPoints,
        current.memory.presetReasoningPoints,
      ),
    }));
  };

  const setAvailableReasoningPoints = (availableReasoningPoints: number) => {
    setState((current) => requireNetworkReinitialize({
      ...current,
      memory: configurePresetMemoryProfile(
        current.graphDefinition,
        current.memory,
        current.memory.presetMemoryPoints,
        availableReasoningPoints,
      ),
    }));
  };

  const selectInferenceStage = (stage: number) => {
    setState((current) => ({
      ...current,
      memory: setSelectedInferenceStage(current.memory, stage),
    }));
  };

  const selectMemoryProfileSource = (
    source: KnowledgeGraphSessionState['memory']['memoryProfileSource'],
  ) => {
    setState((current) => requireNetworkReinitialize({
      ...current,
      memory: setMemoryProfileSource(
        current.graphDefinition,
        current.memory,
        source,
        inferenceMemoryProfile,
      ),
    }));
  };

  const updateDataset = (
    datasetId: string,
    update: (dataset: KnowledgeDataset) => KnowledgeDataset,
  ) => {
    setState((current) => ({
      ...current,
      epoch: 0,
      lossHistory: [],
      datasetCollection: {
        ...current.datasetCollection,
        datasets: current.datasetCollection.datasets.map((dataset) => (
          dataset.id === datasetId ? update(dataset) : dataset
        )),
      },
    }));
  };

  const setDatasetEnabled = (datasetId: string, enabled: boolean) => {
    updateDataset(datasetId, (dataset) => ({ ...dataset, enabled }));
  };

  const setDatasetSplitRatio = (
    datasetId: string,
    splitRatio: DatasetSplitRatio,
  ) => {
    updateDataset(datasetId, (dataset) => ({
      ...dataset,
      splitRatio: {
        train: Math.max(0, splitRatio.train),
        val: Math.max(0, splitRatio.val),
        test: Math.max(0, splitRatio.test),
      },
    }));
  };

  const setDatasetSeed = (datasetId: string, seed: string) => {
    updateDataset(datasetId, (dataset) => ({ ...dataset, seed }));
  };

  const setNodeMemory = (nodeId: string, memory: number) => {
    setState((current) => {
      const node = current.graphDefinition.nodes[nodeId];
      if (!node) return current;
      const nextMemory = cloneKnowledgeGraphMemory(current.memory);
      writeEntityMemory(nextMemory, node, memory);
      return {
        ...current,
        memory: nextMemory,
      };
    });
  };

  const setEdgeMemory = (edgeId: string, memory: number) => {
    setState((current) => {
      const edge = [
        ...current.graphDefinition.depEdges,
        ...current.graphDefinition.subEdges,
        ...current.graphDefinition.interEdges,
      ].find((candidate) => candidate.id === edgeId);
      if (!edge) return current;
      const nextMemory = cloneKnowledgeGraphMemory(current.memory);
      writeEntityMemory(nextMemory, edge, memory);
      return {
        ...current,
        memory: nextMemory,
      };
    });
  };

  const setGraphViewport = (viewport: KnowledgeGraphViewport) => {
    setState((current) => ({ ...current, viewport }));
  };

  const stabilityPercent = () => Math.max(
    0,
    Math.min(100, 17.5 + 2.5 * controls.training.learningRate),
  );

  const initializeNeuralMemory = () => {
    setState((current) => {
      const nextMemory = initializeAllocation(
        current.graphDefinition,
        current.memory,
        controls.network.initializationSeed,
      );
      const loss = evaluateAllocation(
        current.graphDefinition,
        nextMemory,
        datasetSplit,
      );
      const initializationSeed = controls.network.initializationSeed.trim();
      return {
        ...current,
        memory: nextMemory,
        epoch: 0,
        trainingRandomState: createTrainingRandomState(
          initializationSeed
            || DEFAULT_NETWORK_CAPABILITY.initializationSeed,
        ),
        lossHistory: [{
          epoch: 0,
          trainLoss: loss.graphTrainLoss,
          valLoss: loss.graphValLoss,
        }],
        modelInitialized: true,
        networkProfileSignature: getInferenceMemoryProfileSignature(
          inferenceMemoryProfile,
        ),
      };
    });
  };

  const runTrainingStep = () => {
    setState((current) => {
      if (!current.modelInitialized) return current;
      const result = runTrainingSimulation(
        current.graphDefinition,
        current.memory,
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
        memory: result.memory,
        epoch: result.epoch,
        lossHistory: result.lossHistory,
        trainingRandomState: result.trainingRandomState,
      };
    });
  };

  const applyAllocation = (
    allocate: (
      graph: KnowledgeGraphSessionState['graphDefinition'],
      memory: KnowledgeGraphSessionState['memory'],
    ) => KnowledgeGraphSessionState['memory'],
  ) => {
    setState((current) => {
      const nextMemory = allocate(current.graphDefinition, current.memory);
      const loss = evaluateAllocation(
        current.graphDefinition,
        nextMemory,
        datasetSplit,
      );
      const epoch = current.epoch;
      return {
        ...current,
        memory: nextMemory,
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
    selectInferenceStage,
    selectMemoryProfileSource,
    setDatasetEnabled,
    setDatasetSeed,
    setDatasetSplitRatio,
    setNodeMemory,
    setEdgeMemory,
    setGraphViewport,
    initializeNeuralMemory,
    runTrainingStep,
    applyPerfectAllocation: () => applyAllocation(perfectAllocation),
    applyTransferAllocation: () => applyAllocation((graph, memory) => (
      transferAllocation(
        graph,
        memory,
        controls.network.initializationSeed,
        stabilityPercent(),
      )
    )),
  };
}
