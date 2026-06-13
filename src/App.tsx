import { StrictMode, useCallback, useState } from 'react';
import { DesktopCanvas } from './desktop/DesktopCanvas';
import { BlueprintCanvas } from './blueprint/BlueprintCanvas';
import type { ActiveFileState, FileWorkspaceType } from './dataStorage/systemType';



export default function App() {
  const [activeFile, setActiveFile] = useState<ActiveFileState | null>(null);

  const openFile = useCallback((workspace: FileWorkspaceType, fileId: string) => {
    setActiveFile({ workspace, fileId });
  }, []);

  const closeFile = useCallback(() => {
    setActiveFile(null);
  }, []);

  return (
    <StrictMode>
      {activeFile === null ? (
        <DesktopCanvas openFile={openFile} />
      ) : activeFile.workspace === 'blueprint' ? (
        <BlueprintCanvas fileId={activeFile.fileId} closeFile={closeFile} />
      ) : (
        <DesktopCanvas openFile={openFile} />
      )}
    </StrictMode>
  );
}
