import { ReactFlowProvider } from '@xyflow/react';
import { useCallback, useState } from 'react';
import type { CloseFileType } from '../dataStorage/systemType';
import { KnowledgeGraphWorkspace } from './knowledgeGraph/KnowledgeGraphWorkspace';
import { NeuralBlueprintWorkspace } from './neuralBlueprint/NeuralBlueprintWorkspace';
import { PageType, type PageType as BlueprintPageType } from './PageTypes';
import { BlueprintTopBarTabs } from './topBarTabs';
import { TrainingProcessWorkspace } from './trainingProcess/TrainingProcessWorkspace';
import { useBlueprintDataController } from './dataController/useBlueprintDataController';
import {
  EMPTY_INFERENCE_MEMORY_PROFILE,
  type InferenceMemoryProfile,
} from './InferenceMemoryProfileTypes';

interface BlueprintCanvasProp {
  fileId: string;
  closeFile: CloseFileType;
}

export function BlueprintCanvas({ fileId, closeFile }: BlueprintCanvasProp) {
  const [activeWorkspace, setActiveWorkspace] = useState<BlueprintPageType>(
    PageType.NeuralBlueprint,
  );
  const [inferenceMemoryProfile, setInferenceMemoryProfile] =
    useState<InferenceMemoryProfile>(EMPTY_INFERENCE_MEMORY_PROFILE);
  const updateInferenceMemoryProfile = useCallback(
    (profile: InferenceMemoryProfile) => {
      setInferenceMemoryProfile((current) => (
        profileSignature(current) === profileSignature(profile)
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
          <NeuralBlueprintWorkspace
            fileId={fileId}
            onInferenceMemoryProfileChange={updateInferenceMemoryProfile}
          />
        )}
        {activeWorkspace === PageType.KnowledgeGraph && (
          <KnowledgeGraphWorkspace controller={dataController} />
        )}
        {activeWorkspace === PageType.TrainingProcess && (
          <TrainingProcessWorkspace
            controller={dataController}
            fileId={fileId}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}

function profileSignature(profile: InferenceMemoryProfile) {
  return profile.groups.map((group) => (
    `${group.id}:${group.memoryPoint}:${group.inferenceStages.join(',')}`
  )).join('|');
}
