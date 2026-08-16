import { ReactFlowProvider } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  TaskGuideInfoDialog,
  type TaskGuideInfoSource,
} from './taskGuide/TaskGuideInfoDialog';
import { TaskGuideLayer } from './taskGuide/TaskGuideLayer';
import type {
  NeuralBlueprintTaskSnapshot,
  TrainingProcessTaskSnapshot,
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
import { useLanguage } from '../i18n/useLanguage';
import type { TaskGuideStepInfo } from '../taskData/taskGuideTypes';
import type { GameTime } from '../game/gameTypes';
import { AcademicTimeIndicator } from '../time/AcademicTimeIndicator';
import type { AppSettings } from '../dataStorage/appSettingsStorage';
import { DesktopSettingsDialog } from '../desktop/DesktopSettingsDialog';

interface BlueprintCanvasProp {
  appSettings: AppSettings;
  file: DesktopFile;
  gameTime: GameTime;
  closeFile: CloseFileType;
  onAdvanceGameTime: (minutes: number) => void;
  setAppSettings: (settings: AppSettings) => void;
}

export function BlueprintCanvas({
  appSettings,
  file,
  gameTime,
  closeFile,
  onAdvanceGameTime,
  setAppSettings,
}: BlueprintCanvasProp) {
  const { labels, language } = useLanguage();
  const fileId = file.id;
  const features = resolveBlueprintTaskFeatureConfig(file.config);
  const guideConfig = useMemo(
    () => getTaskGuideConfig(fileId, language),
    [fileId, language],
  );
  const [activeWorkspace, setActiveWorkspace] = useState<BlueprintPageType>(
    () => getInitialWorkspace(features),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visitedWorkspaces, setVisitedWorkspaces] = useState<BlueprintPageType[]>(
    () => [getInitialWorkspace(features)],
  );
  const [guideCompletedStepCount, setGuideCompletedStepCount] = useState(
    () => Math.max(0, Math.floor(file.guideCompletedStepCount ?? 0)),
  );
  const [guideInfo, setGuideInfo] = useState<{
    kind: 'step';
    source?: TaskGuideInfoSource;
    stepId: string;
  } | {
    kind: 'completion';
    source?: TaskGuideInfoSource;
  } | null>(null);
  const seenGuideInfoStepIdsRef = useRef<Set<string>>(new Set());
  const [neuralBlueprintSnapshot, setNeuralBlueprintSnapshot] =
    useState<NeuralBlueprintTaskSnapshot>();
  const [trainingProcessSnapshot, setTrainingProcessSnapshot] =
    useState<Partial<TrainingProcessTaskSnapshot>>({});
  const updateTrainingProcessSnapshot = useCallback((
    snapshot: Partial<TrainingProcessTaskSnapshot>,
  ) => {
    setTrainingProcessSnapshot((current) => (
      current.savedCurveCount === snapshot.savedCurveCount
      && current.bestValLoss === snapshot.bestValLoss
      && current.savedBestValLoss === snapshot.savedBestValLoss
        ? current
        : snapshot
    ));
  }, []);
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
    onAdvanceGameTime,
    waitForTraining: appSettings.waitForTraining,
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
      ...trainingProcessSnapshot,
      modelInitialized: !dataController.trainingControls.trainDisabled,
      epoch: dataController.statistics.epoch,
      trainEpochs: dataController.trainingControls.trainEpochs,
    },
  }), [
    activeWorkspace,
    dataController.statistics.epoch,
    dataController.trainingControls.trainEpochs,
    dataController.trainingControls.trainDisabled,
    neuralBlueprintSnapshot,
    trainingProcessSnapshot,
    visitedWorkspaces,
  ]);
  const taskGuide = useMemo(() => (
    guideConfig
      ? evaluateTaskGuide(guideConfig, taskSnapshot, guideCompletedStepCount)
      : undefined
  ), [guideCompletedStepCount, guideConfig, taskSnapshot]);
  const guideInfoContent = useMemo(() => {
    if (!guideInfo || !taskGuide) return null;

    if (guideInfo.kind === 'completion') {
      return taskGuide.completionInfo
        ? {
            actionHint: taskGuide.completionInfo.title,
            actionTitle: taskGuide.title,
            info: taskGuide.completionInfo,
            key: `${taskGuide.id}:completion`,
            variant: 'completion' as const,
          }
        : null;
    }

    const step = taskGuide.steps.find((item) => item.id === guideInfo.stepId);
    if (!step) return null;

    const info: TaskGuideStepInfo = step.info ?? {
      title: step.title,
      body: step.description ?? step.hint,
    };

    return {
      actionHint: step.hint,
      actionTitle: step.title,
      info,
      key: step.id,
      variant: 'step' as const,
    };
  }, [guideInfo, taskGuide]);
  const openGuideInfo = useCallback((
    stepId: string,
    source?: TaskGuideInfoSource,
  ) => {
    setGuideInfo({ kind: 'step', source, stepId });
  }, []);
  const openGuideCompletionInfo = useCallback((
    source?: TaskGuideInfoSource,
  ) => {
    setGuideInfo({ kind: 'completion', source });
  }, []);
  useEffect(() => {
    const activeStep = taskGuide?.activeStep;
    if (!activeStep || activeStep.completed) return;
    if (seenGuideInfoStepIdsRef.current.has(activeStep.id)) return;

    seenGuideInfoStepIdsRef.current.add(activeStep.id);
    openGuideInfo(activeStep.id, getTaskProgressDotSource(activeStep.id));
  }, [openGuideInfo, taskGuide?.activeStep]);
  useEffect(() => {
    const completedStepCount = taskGuide?.completedStepCount ?? 0;
    if (completedStepCount <= guideCompletedStepCount) return;
    const completed = completedStepCount >= (taskGuide?.steps.length ?? 0);

    updateDesktopFile(fileId, (desktopFile) => ({
      ...desktopFile,
      completed,
      guideCompletedStepCount: completedStepCount,
    }));
    const timer = window.setTimeout(() => {
      if (completed && taskGuide?.completionInfo) {
        openGuideCompletionInfo(getTaskProgressDotSource(
          taskGuide.steps.at(-1)?.id,
        ));
      }
      setGuideCompletedStepCount(completedStepCount);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    fileId,
    guideCompletedStepCount,
    openGuideCompletionInfo,
    taskGuide?.completionInfo,
    taskGuide?.completedStepCount,
    taskGuide?.steps,
    taskGuide?.steps.length,
  ]);
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
        <div className="blueprint-top-bar-status">
          <button
            aria-label={labels.desktop.leftPanel.settings}
            className="blueprint-settings-button"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            ⚙
          </button>
          <AcademicTimeIndicator time={gameTime} />
        </div>
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
            onTaskSnapshotChange={updateTrainingProcessSnapshot}
            showMemoryReasoningControls={
              features.neuralBlueprint.showBackwardAnalysisControl
            }
          />
        )}
      </ReactFlowProvider>
      {settingsOpen && (
        <DesktopSettingsDialog
          appSettings={appSettings}
          onClose={() => setSettingsOpen(false)}
          setAppSettings={setAppSettings}
        />
      )}

      {taskGuide && (
        <TaskProgressBar
          guide={taskGuide}
          onCompletionInfoRequest={openGuideCompletionInfo}
          onStepInfoRequest={openGuideInfo}
        />
      )}
      {taskGuide && <TaskGuideLayer guide={taskGuide} />}
      {taskGuide && guideInfoContent && (
        <TaskGuideInfoDialog
          actionHint={guideInfoContent.actionHint}
          actionTitle={guideInfoContent.actionTitle}
          guideTitle={taskGuide.title}
          info={guideInfoContent.info}
          key={guideInfoContent.key}
          motionKey={guideInfoContent.key}
          source={guideInfo?.source}
          variant={guideInfoContent.variant}
          onClose={() => setGuideInfo(null)}
        />
      )}
    </div>
  );
}

function getTaskProgressDotSource(
  stepId: string | undefined,
): TaskGuideInfoSource | undefined {
  if (!stepId) return undefined;
  const dot = document.querySelector<HTMLButtonElement>(
    `[data-task-progress-step-id="${stepId}"]`,
  );
  const rect = dot?.getBoundingClientRect();
  if (!rect) return undefined;

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getInitialWorkspace(
  features: ResolvedBlueprintTaskFeatureConfig,
): BlueprintPageType {
  if (features.neuralBlueprint.canOpenTab) return PageType.NeuralBlueprint;
  if (features.knowledgeGraph.canOpenTab) return PageType.KnowledgeGraph;
  return PageType.TrainingProcess;
}
