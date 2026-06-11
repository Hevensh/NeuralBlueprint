import { StrictMode, useState } from 'react';
import { DesktopCanvas } from './desktop/DesktopCanvas';
import { BlueprintCanvas } from './blueprint/BlueprintCanvas';



export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<'desktop' | 'blueprint' | 'report'>('desktop');

  return (
    <StrictMode>
        {activeWorkspace === 'desktop' ? (
          <DesktopCanvas setPage={setActiveWorkspace}/>
        ) : activeWorkspace === 'blueprint' ? (
          <BlueprintCanvas setPage={setActiveWorkspace}/>
        ) : (
          <DesktopCanvas setPage={setActiveWorkspace}/>
        )}
    </StrictMode>
  );
}