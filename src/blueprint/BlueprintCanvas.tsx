import { ReactFlowProvider } from '@xyflow/react';
import { useState } from 'react';
import type { CloseFileType } from '../dataStorage/systemType';
import { KnowledgeGraphWorkspace } from './knowledgeGraph/KnowledgeGraphWorkspace';
import { NeuralBlueprintWorkspace } from './neuralBlueprint/NeuralBlueprintWorkspace';
import { PageType, type PageType as BlueprintPageType } from './PageTypes';
import { BlueprintTopBarTabs } from './topBarTabs';
import { TrainingProcessWorkspace } from './trainingProcess/TrainingProcessWorkspace';
import { useKnowledgeGraphController } from './knowledgeGraph/useKnowledgeGraphController';

interface BlueprintCanvasProp {
  fileId: string;
  closeFile: CloseFileType;
}

export function BlueprintCanvas({ fileId, closeFile }: BlueprintCanvasProp) {
  const [activeWorkspace, setActiveWorkspace] = useState<BlueprintPageType>(
    PageType.NeuralBlueprint,
  );
  const knowledgeController = useKnowledgeGraphController({ fileId });
  const title = {
    [PageType.NeuralBlueprint]: 'Neural BluePrint',
    [PageType.KnowledgeGraph]: 'Knowledge Graph',
    [PageType.TrainingProcess]: 'Training Process',
  }[activeWorkspace];

  return (
    <div className="workspace">
      <header className="top-bar">
        <button className="close-button" onClick={closeFile} />
        <BlueprintTopBarTabs
          activeWorkspace={activeWorkspace}
          onWorkspaceChange={setActiveWorkspace}
        />
        <div className="title">{title}</div>
      </header>

      <ReactFlowProvider key={activeWorkspace}>
        {activeWorkspace === PageType.NeuralBlueprint && (
          <NeuralBlueprintWorkspace fileId={fileId} />
        )}
        {activeWorkspace === PageType.KnowledgeGraph && (
          <KnowledgeGraphWorkspace controller={knowledgeController} />
        )}
        {activeWorkspace === PageType.TrainingProcess && (
          <TrainingProcessWorkspace
            controller={knowledgeController}
            fileId={fileId}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}
