import { useCallback, useEffect, useRef, useState } from 'react';
import { DesktopCanvas } from './desktop/DesktopCanvas';
import { BlueprintCanvas } from './blueprint/BlueprintCanvas';
import type { ActiveFileState, FileWorkspaceType } from './dataStorage/systemType';
import type { DesktopFile } from './desktop/desktopTypes';
import { LanguageProvider } from './i18n/LanguageContext';
import { LabWorkspace } from './lab/LabWorkspace';
import { loadGameProgress, saveGameProgress } from './dataStorage/gameStorage';
import { loadDesktopFiles } from './dataStorage/desktopStorage';
import {
  loadAppSettings,
  saveAppSettings,
} from './dataStorage/appSettingsStorage';
import { advanceGameTime } from './time/academicTime';

const DEVELOPMENT_START_FILE_ID = 'experimental_nbp';

type AppScene =
  | { type: 'lab' }
  | { type: 'desktop' }
  | { type: 'file'; activeFile: ActiveFileState };

type SceneTransitionTarget = 'lab' | 'desktop' | null;
type SceneTransitionPhase = 'out' | 'in';

export default function App() {
  const [gameProgress, setGameProgress] = useState(loadGameProgress);
  const [appSettings, setAppSettings] = useState(loadAppSettings);
  const [scene, setScene] = useState<AppScene>(createInitialScene);
  const [transitionTarget, setTransitionTarget] =
    useState<SceneTransitionTarget>(null);
  const [transitionPhase, setTransitionPhase] =
    useState<SceneTransitionPhase>('out');
  const switchTimerRef = useRef<number | null>(null);
  const revealFrameRef = useRef<number | null>(null);

  const transitionTo = useCallback((nextScene: AppScene) => {
    if (transitionTarget || nextScene.type === 'file') return;
    setTransitionTarget(nextScene.type);
    setTransitionPhase('out');
    switchTimerRef.current = window.setTimeout(() => {
      setScene(nextScene);
      setTransitionPhase('in');
      revealFrameRef.current = window.requestAnimationFrame(() => {
        revealFrameRef.current = window.requestAnimationFrame(() => {
          setTransitionTarget(null);
        });
      });
    }, 220);
  }, [transitionTarget]);

  useEffect(() => () => {
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    if (revealFrameRef.current !== null) window.cancelAnimationFrame(revealFrameRef.current);
  }, []);

  useEffect(() => {
    saveGameProgress(gameProgress);
  }, [gameProgress]);

  useEffect(() => {
    saveAppSettings(appSettings);
  }, [appSettings]);

  const advanceTrainingTime = useCallback((minutes: number) => {
    setGameProgress((current) => ({
      ...current,
      time: advanceGameTime(current.time, minutes),
    }));
  }, []);

  const openFile = useCallback((workspace: FileWorkspaceType, file: DesktopFile) => {
    setScene({ type: 'file', activeFile: { workspace, file } });
  }, []);

  const closeFile = useCallback(() => {
    setScene({ type: 'desktop' });
  }, []);

  return (
    <LanguageProvider>
      <div
        className={`app-shell theme-${getSceneTheme(scene)} ${transitionTarget ? `scene-transitioning transition-${transitionPhase} to-${transitionTarget}` : ''}`}
      >
        <div className="app-scene-content" key={getSceneKey(scene)}>
          {scene.type === 'lab' ? (
            <LabWorkspace
              appSettings={appSettings}
              gameProgress={gameProgress}
              setAppSettings={setAppSettings}
              setGameProgress={setGameProgress}
              onOpenDesktop={() => transitionTo({ type: 'desktop' })}
            />
          ) : scene.type === 'desktop' ? (
            <DesktopCanvas
              appSettings={appSettings}
              gameTime={gameProgress.time}
              openFile={openFile}
              onReturnToLab={() => transitionTo({ type: 'lab' })}
              setAppSettings={setAppSettings}
            />
          ) : scene.activeFile.workspace === 'blueprint' ? (
            <BlueprintCanvas
              appSettings={appSettings}
              key={scene.activeFile.file.id}
              file={scene.activeFile.file}
              gameTime={gameProgress.time}
              closeFile={closeFile}
              onAdvanceGameTime={advanceTrainingTime}
              setAppSettings={setAppSettings}
            />
          ) : (
            <DesktopCanvas
              appSettings={appSettings}
              gameTime={gameProgress.time}
              openFile={openFile}
              onReturnToLab={() => transitionTo({ type: 'lab' })}
              setAppSettings={setAppSettings}
            />
          )}
        </div>
      </div>
    </LanguageProvider>
  );
}

function createInitialScene(): AppScene {
  if (!import.meta.env.DEV) return { type: 'lab' };

  const file = loadDesktopFiles().find(
    (desktopFile) => desktopFile.id === DEVELOPMENT_START_FILE_ID,
  );

  return file
    ? { type: 'file', activeFile: { workspace: 'blueprint', file } }
    : { type: 'lab' };
}

function getSceneKey(scene: AppScene) {
  return scene.type === 'file' ? `file-${scene.activeFile.file.id}` : scene.type;
}

function getSceneTheme(scene: AppScene) {
  return scene.type === 'lab' ? 'lab' : 'desktop';
}
