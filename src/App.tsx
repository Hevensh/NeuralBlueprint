import { StrictMode, useCallback, useState } from 'react';
import { DesktopCanvas } from './desktop/DesktopCanvas';
import { BlueprintCanvas } from './blueprint/BlueprintCanvas';
import type { ActiveFileState, FileWorkspaceType } from './dataStorage/systemType';
import type { DesktopFile } from './desktop/desktopTypes';
import { LanguageProvider } from './i18n/LanguageContext';


export default function App() {
  const [activeFile, setActiveFile] = useState<ActiveFileState | null>(null);

  const openFile = useCallback((workspace: FileWorkspaceType, file: DesktopFile) => {
    setActiveFile({ workspace, file });
  }, []);

  const closeFile = useCallback(() => {
    setActiveFile(null);
  }, []);

  return (
    <StrictMode>
      <LanguageProvider>
        {activeFile === null ? (
          <DesktopCanvas openFile={openFile} />
        ) : activeFile.workspace === 'blueprint' ? (
          <BlueprintCanvas
            key={activeFile.file.id}
            file={activeFile.file}
            closeFile={closeFile}
          />
        ) : (
          <DesktopCanvas openFile={openFile} />
        )}
      </LanguageProvider>
    </StrictMode>
  );
}
