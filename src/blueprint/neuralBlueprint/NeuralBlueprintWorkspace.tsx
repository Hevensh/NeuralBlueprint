import { useState } from 'react';
import { loadNeuralBlueprintUi } from '../../dataStorage/neuralBlueprintStorage';
import type { BlueprintTaskFeatureConfig } from '../../taskData/blueprintFeatureConfig';
import type { InferenceMemoryProfile } from '../InferenceMemoryProfileTypes';
import type {
  ModuleAnalysisDirection,
  ModuleNodeData,
} from './ModuleBaseNodeTypes';
import { NeuralBlueprintCanvasInner } from './NeuralBlueprintCanvasInner';
import { NeuralBlueprintLeftPanel } from './NeuralBlueprintLeftPanel';
import { NeuralBlueprintRightPanel } from './NeuralBlueprintRightPanel';

interface NeuralBlueprintWorkspaceProp {
  fileId: string;
  features: BlueprintTaskFeatureConfig['neuralBlueprint'];
  onInferenceMemoryProfileChange: (profile: InferenceMemoryProfile) => void;
}

export function NeuralBlueprintWorkspace({
  fileId,
  features,
  onInferenceMemoryProfileChange,
}: NeuralBlueprintWorkspaceProp) {
  const [initialUi] = useState(() => loadNeuralBlueprintUi(fileId));
  const [selectedNode, setSelectedNode] = useState<ModuleNodeData | null>(null);
  const [showVarianceAnalysis, setShowVarianceAnalysis] = useState(initialUi.showVarianceAnalysis);
  const [showRankAnalysis, setShowRankAnalysis] = useState(initialUi.showRankAnalysis);
  const [analysisDirection, setAnalysisDirection] = useState<ModuleAnalysisDirection>(
    initialUi.analysisDirection,
  );
  const [arrangeRequest, setArrangeRequest] = useState(0);
  const effectiveAnalysisDirection = features.showBackwardAnalysisControl
    ? analysisDirection
    : 'forward';
  const effectiveShowVarianceAnalysis = features.showVarianceAnalysisToggle
    && showVarianceAnalysis;
  const effectiveShowRankAnalysis = features.showRankAnalysisToggle
    && showRankAnalysis;

  return (
    <>
      <NeuralBlueprintLeftPanel
        availableModuleKinds={features.availableModuleKinds}
        onArrangeNodes={() => setArrangeRequest((request) => request + 1)}
      />
      <NeuralBlueprintCanvasInner
        arrangeRequest={arrangeRequest}
        analysisDirection={effectiveAnalysisDirection}
        availableModuleKinds={features.availableModuleKinds}
        fileId={fileId}
        showRankAnalysis={effectiveShowRankAnalysis}
        showVarianceAnalysis={effectiveShowVarianceAnalysis}
        setSelectedNode={setSelectedNode}
      />
      <NeuralBlueprintRightPanel
        analysisDirection={effectiveAnalysisDirection}
        features={features}
        selectedNode={selectedNode}
        showRankAnalysis={effectiveShowRankAnalysis}
        showVarianceAnalysis={effectiveShowVarianceAnalysis}
        setShowRankAnalysis={setShowRankAnalysis}
        setShowVarianceAnalysis={setShowVarianceAnalysis}
        setAnalysisDirection={setAnalysisDirection}
        setSelectedNode={setSelectedNode}
        onInferenceMemoryProfileChange={onInferenceMemoryProfileChange}
      />
    </>
  );
}
