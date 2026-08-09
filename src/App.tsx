import { StrictMode, useCallback, useState } from 'react';
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

export default function App() {
  const [scene, setScene] = useState<AppScene>({ type: 'lab' });

  const openFile = useCallback((workspace: FileWorkspaceType, file: DesktopFile) => {
    setScene({ type: 'file', activeFile: { workspace, file } });
  }, []);

  const closeFile = useCallback(() => {
    setScene({ type: 'desktop' });
  }, []);

  return (
    <StrictMode>
      <LanguageProvider>
        {scene.type === 'lab' ? (
          <LabWorkspace onOpenDesktop={() => setScene({ type: 'desktop' })} />
        ) : scene.type === 'desktop' ? (
          <DesktopCanvas
            openFile={openFile}
            onReturnToLab={() => setScene({ type: 'lab' })}
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
            onReturnToLab={() => setScene({ type: 'lab' })}
          />
        )}
      </LanguageProvider>
    </StrictMode>
  );
}
