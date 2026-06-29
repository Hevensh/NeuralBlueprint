import { ReactFlowProvider } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { updateDesktopFile } from '../dataStorage/desktopStorage';
import type { CloseFileType } from '../dataStorage/systemType';
import type { DesktopFile } from '../desktop/desktopTypes';
import {
  resolveBlueprintTaskFeatureConfig,
  type ResolvedBlueprintTaskFeatureConfig,
} from '../taskData/blueprintFeatureConfig';
import { getTaskGuideConfig } from '../taskData/taskGuideRegistry';
import { KnowledgeGraphWorkspace } from './knowledgeGraph/KnowledgeGraphWorkspace';
import { NeuralBlueprintWorkspace } from './neuralBlueprint/NeuralBlueprintWorkspace';
import { PageType, type PageType as BlueprintPageType } from './PageTypes';
import { TaskProgressBar } from './TaskProgressBar';
import { evaluateTaskGuide } from './taskGuide/evaluateTaskGuide';
import { TaskGuideLayer } from './taskGuide/TaskGuideLayer';
import type {
  NeuralBlueprintTaskSnapshot,
  TaskRuntimeSnapshot,
} from './taskGuide/taskGuideSnapshot';
import { BlueprintTopBarTabs } from './topBarTabs';
import { TrainingProcessWorkspace } from './trainingProcess/TrainingProcessWorkspace';
import { useBlueprintDataController } from './dataController/useBlueprintDataController';
import {
  EMPTY_INFERENCE_MEMORY_PROFILE,
  getInferenceMemoryProfileSignature,
  type InferenceMemoryProfile,
} from './InferenceMemoryProfileTypes';

interface BlueprintCanvasProp {
  file: DesktopFile;
  closeFile: CloseFileType;
}

export function BlueprintCanvas({ file, closeFile }: BlueprintCanvasProp) {
  const fileId = file.id;
  const features = resolveBlueprintTaskFeatureConfig(file.config);
  const guideConfig = getTaskGuideConfig(fileId);
  const [activeWorkspace, setActiveWorkspace] = useState<BlueprintPageType>(
    () => getInitialWorkspace(features),
  );
  const [visitedWorkspaces, setVisitedWorkspaces] = useState<BlueprintPageType[]>(
    () => [getInitialWorkspace(features)],
  );
  const [guideCompletedStepCount, setGuideCompletedStepCount] = useState(
    () => Math.max(0, Math.floor(file.guideCompletedStepCount ?? 0)),
  );
  const [neuralBlueprintSnapshot, setNeuralBlueprintSnapshot] =
    useState<NeuralBlueprintTaskSnapshot>();
  const [selectedInferenceModelId, setSelectedInferenceModelId] =
    useState<string>('');
  const [inferenceMemoryProfile, setInferenceMemoryProfile] =
    useState<InferenceMemoryProfile>(EMPTY_INFERENCE_MEMORY_PROFILE);
  const updateInferenceMemoryProfile = useCallback(
    (profile: InferenceMemoryProfile) => {
      setInferenceMemoryProfile((current) => (
        getInferenceMemoryProfileSignature(current)
          === getInferenceMemoryProfileSignature(profile)
          ? current
          : profile
      ));
    },
    [],
  );
  const dataController = useBlueprintDataController({
    fileId,
    inferenceMemoryProfile,
  });
  const changeWorkspace = useCallback((workspace: BlueprintPageType) => {
    setActiveWorkspace(workspace);
    setVisitedWorkspaces((current) => (
      current.includes(workspace) ? current : [...current, workspace]
    ));
  }, []);
  const taskSnapshot = useMemo<TaskRuntimeSnapshot>(() => ({
    activeWorkspace,
    visitedWorkspaces,
    neuralBlueprint: neuralBlueprintSnapshot,
    trainingProcess: {
      modelInitialized: !dataController.trainingControls.trainDisabled,
      epoch: dataController.statistics.epoch,
      trainSteps: dataController.trainingControls.trainSteps,
    },
  }), [
    activeWorkspace,
    dataController.statistics.epoch,
    dataController.trainingControls.trainSteps,
    dataController.trainingControls.trainDisabled,
    neuralBlueprintSnapshot,
    visitedWorkspaces,
  ]);
  const taskGuide = useMemo(() => (
    guideConfig
      ? evaluateTaskGuide(guideConfig, taskSnapshot, guideCompletedStepCount)
      : undefined
  ), [guideCompletedStepCount, guideConfig, taskSnapshot]);
  useEffect(() => {
    const completedStepCount = taskGuide?.completedStepCount ?? 0;
    if (completedStepCount <= guideCompletedStepCount) return;

    updateDesktopFile(fileId, (desktopFile) => ({
      ...desktopFile,
      guideCompletedStepCount: completedStepCount,
    }));
    const timer = window.setTimeout(() => {
      setGuideCompletedStepCount(completedStepCount);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fileId, guideCompletedStepCount, taskGuide?.completedStepCount]);
  const title = {
    [PageType.NeuralBlueprint]: 'Neural BluePrint',
    [PageType.KnowledgeGraph]: 'Knowledge Graph',
    [PageType.TrainingProcess]: 'Training Process',
  }[activeWorkspace];

  return (
    <div className="workspace blueprint-workspace">
      <header className="top-bar">
        <button className="close-button" onClick={closeFile} />
        <BlueprintTopBarTabs
          activeWorkspace={activeWorkspace}
          showNeuralBlueprintTab={features.neuralBlueprint.canOpenTab}
          showKnowledgeGraphTab={features.knowledgeGraph.canOpenTab}
          onWorkspaceChange={changeWorkspace}
        />
        <div className="title">{title}</div>
      </header>

      <ReactFlowProvider key={activeWorkspace}>
        {activeWorkspace === PageType.NeuralBlueprint
          && features.neuralBlueprint.canOpenTab && (
          <NeuralBlueprintWorkspace
            fileId={fileId}
            features={features.neuralBlueprint}
            onInferenceMemoryProfileChange={updateInferenceMemoryProfile}
            onTaskSnapshotChange={setNeuralBlueprintSnapshot}
            selectedInferenceModelId={selectedInferenceModelId}
            setSelectedInferenceModelId={setSelectedInferenceModelId}
          />
        )}
        {activeWorkspace === PageType.KnowledgeGraph
          && features.knowledgeGraph.canOpenTab && (
          <KnowledgeGraphWorkspace
            controller={dataController}
            features={features.knowledgeGraph}
            showMemoryReasoningControls={
              features.neuralBlueprint.showBackwardAnalysisControl
            }
          />
        )}
        {activeWorkspace === PageType.TrainingProcess && (
          <TrainingProcessWorkspace
            controller={dataController}
            features={features.knowledgeGraph}
            fileId={fileId}
            showMemoryReasoningControls={
              features.neuralBlueprint.showBackwardAnalysisControl
            }
          />
        )}
      </ReactFlowProvider>

      {taskGuide && <TaskProgressBar guide={taskGuide} />}
      {taskGuide && <TaskGuideLayer guide={taskGuide} />}
    </div>
  );
}

function getInitialWorkspace(
  features: ResolvedBlueprintTaskFeatureConfig,
): BlueprintPageType {
  if (features.neuralBlueprint.canOpenTab) return PageType.NeuralBlueprint;
  if (features.knowledgeGraph.canOpenTab) return PageType.KnowledgeGraph;
  return PageType.TrainingProcess;
}
