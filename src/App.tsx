import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { DesktopCanvas } from './desktop/DesktopCanvas';
import { BlueprintCanvas } from './blueprint/BlueprintCanvas';
import type { ActiveFileState, FileWorkspaceType } from './dataStorage/systemType';
import type { DesktopFile } from './desktop/desktopTypes';
import { LanguageProvider } from './i18n/LanguageContext';
import { LabWorkspace } from './lab/LabWorkspace';

type AppScene =
  | { type: 'lab' }
  | { type: 'desktop' }
  | { type: 'file'; activeFile: ActiveFileState };

type SceneTransitionTarget = 'lab' | 'desktop' | null;
type SceneTransitionPhase = 'out' | 'in';

export default function App() {
  const [scene, setScene] = useState<AppScene>({ type: 'lab' });
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

  const openFile = useCallback((workspace: FileWorkspaceType, file: DesktopFile) => {
    setScene({ type: 'file', activeFile: { workspace, file } });
  }, []);

  const closeFile = useCallback(() => {
    setScene({ type: 'desktop' });
  }, []);

  return (
    <StrictMode>
      <LanguageProvider>
        <div
          className={`app-shell theme-${getSceneTheme(scene)} ${transitionTarget ? `scene-transitioning transition-${transitionPhase} to-${transitionTarget}` : ''}`}
        >
          <div className="app-scene-content" key={getSceneKey(scene)}>
            {scene.type === 'lab' ? (
              <LabWorkspace onOpenDesktop={() => transitionTo({ type: 'desktop' })} />
            ) : scene.type === 'desktop' ? (
              <DesktopCanvas
                openFile={openFile}
                onReturnToLab={() => transitionTo({ type: 'lab' })}
              />
            ) : scene.activeFile.workspace === 'blueprint' ? (
              <BlueprintCanvas
                key={scene.activeFile.file.id}
                file={scene.activeFile.file}
                closeFile={closeFile}
              />
            ) : (
              <DesktopCanvas
                openFile={openFile}
                onReturnToLab={() => transitionTo({ type: 'lab' })}
              />
            )}
          </div>
        </div>
      </LanguageProvider>
    </StrictMode>
  );
}

function getSceneKey(scene: AppScene) {
  return scene.type === 'file' ? `file-${scene.activeFile.file.id}` : scene.type;
}

function getSceneTheme(scene: AppScene) {
  return scene.type === 'lab' ? 'lab' : 'desktop';
}
