import { useEffect, useMemo, useState } from 'react';
import { useCallback } from 'react';
import {
  getInferenceMemoryProfileSignature,
  type InferenceMemoryProfile,
} from '../InferenceMemoryProfileTypes';
import { useRef } from 'react';
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
import type { OptimizerKind } from '../knowledgeGraph/model/types';
import { buildKnowledgeGraphElements } from '../knowledgeGraph/buildKnowledgeGraphElements';
import type { KnowledgeGraphNodeData } from '../knowledgeGraph/KnowledgeGraphNodeTypes';
import { createBlueprintDataActions } from './blueprintDataActions';
import { estimateUtilityReport } from '../knowledgeGraph/model/utilityEstimate';
import {
  applyPretrainedModuleAllocation,
  clearAllocation,
  initializeAllocation,
} from '../knowledgeGraph/model/allocationStrategies';
import { estimateTrainingRun } from '../neuralBlueprint/analysis/trainingResources';

const REAL_MILLISECONDS_PER_GAME_MINUTE = 100;

interface ActiveTrainingRun {
  totalEpochs: number;
  completedEpochs: number;
  elapsedGameMinutes: number;
  totalGameMinutes: number;
  gameMinutesPerEpoch: number;
}

function createInitialState(fileId: string): KnowledgeGraphSessionState {
  const saved = loadKnowledgeGraphSession(fileId);
  if (saved) return saved;
  const taskInitialState = getTaskFileInitialState(fileId);
  const initialState = taskInitialState?.knowledgeGraph;
  return {
    ...createKnowledgeGraphSession(
    initialState?.graphDefinition,
    initialState?.datasetCollection,
    ),
    pretraining: taskInitialState?.pretraining,
  };
}

export function useBlueprintDataController({
  fileId,
  inferenceMemoryProfile,
  onAdvanceGameTime,
  waitForTraining,
}: {
  fileId: string;
  inferenceMemoryProfile: InferenceMemoryProfile;
  onAdvanceGameTime: (minutes: number) => void;
  waitForTraining: boolean;
}) {
  const [state, setState] = useState(() => createInitialState(fileId));
  const stateRef = useRef(state);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTrainingRun, setActiveTrainingRun] =
    useState<ActiveTrainingRun | null>(null);
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
  const trainingRunEstimate = useMemo(() => estimateTrainingRun(
    inferenceMemoryProfile.trainingResources,
    datasetSplit.samples.train,
    controls.training.optimizer,
  ), [
    controls.training.optimizer,
    datasetSplit.samples.train,
    inferenceMemoryProfile.trainingResources,
  ]);
  const startTraining = useCallback(() => {
    if (!state.modelInitialized || activeTrainingRun) return;
    if (!trainingRunEstimate.fitsInVram) return;

    const totalEpochs = Math.max(1, Math.floor(controls.training.trainEpochs));
    const totalGameMinutes = totalEpochs
      * trainingRunEstimate.gameMinutesPerEpoch;
    if (!waitForTraining) {
      actions.runTrainingEpochs(totalEpochs);
      onAdvanceGameTime(totalGameMinutes);
      return;
    }

    setActiveTrainingRun({
      totalEpochs,
      completedEpochs: 0,
      elapsedGameMinutes: 0,
      totalGameMinutes,
      gameMinutesPerEpoch: trainingRunEstimate.gameMinutesPerEpoch,
    });
  }, [
    actions,
    activeTrainingRun,
    controls.training.trainEpochs,
    onAdvanceGameTime,
    state.modelInitialized,
    trainingRunEstimate.fitsInVram,
    trainingRunEstimate.gameMinutesPerEpoch,
    waitForTraining,
  ]);
  const activePretraining = inferenceMemoryProfile.pretrainingModules.length > 0
    ? state.pretraining ?? { source: 'ResNet module preset' }
    : undefined;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const signature = getInferenceMemoryProfileSignature(
        inferenceMemoryProfile,
      );
      const hasResolvedProfile = signature.length > 0;

      setState((current) => {
        let memory = syncBlueprintMemoryProfile(
          current.graphDefinition,
          current.memory,
          inferenceMemoryProfile,
        );
        const networkChanged = hasResolvedProfile
          && current.networkProfileSignature !== signature;
        const shouldResetForNetworkChange = Boolean(
          current.memory.memoryProfileSource === 'blueprint'
          && hasResolvedProfile
          && networkChanged,
        );
        if (shouldResetForNetworkChange) {
          memory = inferenceMemoryProfile.pretrainingModules.length > 0
            ? applyPretrainedModuleAllocation(
                current.graphDefinition,
                initializeAllocation(
                  current.graphDefinition,
                  memory,
                  controls.network.initializationSeed,
                ),
                inferenceMemoryProfile.pretrainingModules,
              )
            : clearAllocation(current.graphDefinition, memory);
        }

        if (memory === current.memory && !networkChanged && !shouldResetForNetworkChange) return current;

        return {
          ...current,
          memory,
          epoch: 0,
          lossHistory: [],
          modelInitialized: shouldResetForNetworkChange
            && inferenceMemoryProfile.pretrainingModules.length > 0,
          networkProfileSignature: hasResolvedProfile
            ? signature
            : current.networkProfileSignature,
        };
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    controls.network.initializationSeed,
    inferenceMemoryProfile,
    state.memory.memoryProfileSource,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => saveKnowledgeGraphSession(fileId, state),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [fileId, state]);

  useEffect(() => {
    const saveLatestState = () => {
      saveKnowledgeGraphSession(fileId, stateRef.current);
    };

    window.addEventListener('pagehide', saveLatestState);
    return () => {
      window.removeEventListener('pagehide', saveLatestState);
      saveLatestState();
    };
  }, [fileId]);

  useEffect(() => {
    if (!activeTrainingRun) return;

    if (!waitForTraining) {
      const timer = window.setTimeout(() => {
        const remainingEpochs = activeTrainingRun.totalEpochs
          - activeTrainingRun.completedEpochs;
        const remainingMinutes = activeTrainingRun.totalGameMinutes
          - activeTrainingRun.elapsedGameMinutes;
        if (remainingEpochs > 0) actions.runTrainingEpochs(remainingEpochs);
        if (remainingMinutes > 0) onAdvanceGameTime(remainingMinutes);
        setActiveTrainingRun(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      const elapsedGameMinutes = Math.min(
        activeTrainingRun.totalGameMinutes,
        activeTrainingRun.elapsedGameMinutes + 1,
      );
      const completedEpochs = Math.min(
        activeTrainingRun.totalEpochs,
        Math.floor(
          elapsedGameMinutes / activeTrainingRun.gameMinutesPerEpoch,
        ),
      );
      const newEpochs = completedEpochs - activeTrainingRun.completedEpochs;
      if (newEpochs > 0) actions.runTrainingEpochs(newEpochs);
      onAdvanceGameTime(1);
      setActiveTrainingRun(elapsedGameMinutes >= activeTrainingRun.totalGameMinutes
        ? null
        : {
          ...activeTrainingRun,
          completedEpochs,
          elapsedGameMinutes,
        });
    }, REAL_MILLISECONDS_PER_GAME_MINUTE);
    return () => window.clearTimeout(timer);
  }, [
    actions,
    activeTrainingRun,
    onAdvanceGameTime,
    waitForTraining,
  ]);

  return {
    elements,
    selectedNode,
    selectNode: setSelectedNodeId,
    analysisPreview: state.ui,
    setAnalysisPreview: (
      patch: Partial<KnowledgeGraphSessionState['ui']>,
    ) => setState((current) => ({
      ...current,
      ui: {
        ...current.ui,
        ...patch,
      },
    })),
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
      optimizer: controls.training.optimizer,
      learningRate: controls.training.learningRate,
      regularizationRate: controls.training.regularizationRate,
      trainEpochs: controls.training.trainEpochs,
      trainDisabled: !state.modelInitialized
        || Boolean(activeTrainingRun)
        || !trainingRunEstimate.fitsInVram,
      training: Boolean(activeTrainingRun),
      trainingProgress: activeTrainingRun
        ? activeTrainingRun.elapsedGameMinutes
          / Math.max(1, activeTrainingRun.totalGameMinutes)
        : 0,
      trainingMinutes: controls.training.trainEpochs
        * trainingRunEstimate.gameMinutesPerEpoch,
      trainingMinutesPerEpoch: trainingRunEstimate.gameMinutesPerEpoch,
      trainingResourceError: !inferenceMemoryProfile.trainingResources.valid
        ? 'invalid-model' as const
        : !trainingRunEstimate.fitsInVram
          ? 'insufficient-vram' as const
          : undefined,
      onLearningRateChange: (value: number) => (
        actions.updateTrainingControls({ learningRate: value })
      ),
      onOptimizerChange: (optimizer: OptimizerKind) => (
        actions.updateTrainingControls({ optimizer })
      ),
      onRegularizationRateChange: (value: number) => (
        actions.updateTrainingControls({ regularizationRate: value })
      ),
      onTrainEpochsChange: (value: number) => (
        actions.updateTrainingControls({ trainEpochs: value })
      ),
      onTrain: startTraining,
      onTransfer: actions.applyTransferAllocation,
      onPerfect: actions.applyPerfectAllocation,
      onReset: actions.resetTrainingControls,
    },
    statistics: {
      stats,
      loss,
      dataset: datasetSplit,
      epoch: state.epoch,
      pretraining: activePretraining,
    },
    trainingResources: {
      profile: inferenceMemoryProfile.trainingResources,
      run: trainingRunEstimate,
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
    setNodeAdaptationRequirement: actions.setNodeAdaptationRequirement,
    setEdgeAdaptationRequirement: actions.setEdgeAdaptationRequirement,
    setNodeAdaptationAxis: actions.setNodeAdaptationAxis,
    setEdgeAdaptationAxis: actions.setEdgeAdaptationAxis,
  };
}

export type BlueprintDataController = ReturnType<
  typeof useBlueprintDataController
>;
