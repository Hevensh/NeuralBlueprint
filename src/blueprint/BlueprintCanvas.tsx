import { ReactFlowProvider } from '@xyflow/react';
import { useCallback, useState } from 'react';
import type { CloseFileType } from '../dataStorage/systemType';
import { getBlueprintTaskFeatureConfig } from '../taskData/blueprintFeatureConfig';
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
  const features = getBlueprintTaskFeatureConfig();
  const [activeWorkspace, setActiveWorkspace] = useState<BlueprintPageType>(
    () => getInitialWorkspace(features),
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
    <div className="workspace blueprint-workspace">
      <header className="top-bar">
        <button className="close-button" onClick={closeFile} />
        <BlueprintTopBarTabs
          activeWorkspace={activeWorkspace}
          showNeuralBlueprintTab={features.neuralBlueprint.canOpenTab}
          showKnowledgeGraphTab={features.knowledgeGraph.canOpenTab}
          onWorkspaceChange={setActiveWorkspace}
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
          />
        )}
        {activeWorkspace === PageType.KnowledgeGraph
          && features.knowledgeGraph.canOpenTab && (
          <KnowledgeGraphWorkspace
            controller={dataController}
            features={features.knowledgeGraph}
          />
        )}
        {activeWorkspace === PageType.TrainingProcess && (
          <TrainingProcessWorkspace
            controller={dataController}
            features={features.knowledgeGraph}
            fileId={fileId}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}

function getInitialWorkspace(
  features: ReturnType<typeof getBlueprintTaskFeatureConfig>,
): BlueprintPageType {
  if (features.neuralBlueprint.canOpenTab) return PageType.NeuralBlueprint;
  if (features.knowledgeGraph.canOpenTab) return PageType.KnowledgeGraph;
  return PageType.TrainingProcess;
}

function profileSignature(profile: InferenceMemoryProfile) {
  return profile.groups.map((group) => (
    `${group.id}:${group.memoryPoint}:${group.inferenceStages.join(',')}`
  )).join('|');
}
