import { useState } from 'react';
import { loadNeuralBlueprintUi } from '../../dataStorage/neuralBlueprintStorage';
import type { ResolvedBlueprintTaskFeatureConfig } from '../../taskData/blueprintFeatureConfig';
import type { InferenceMemoryProfile } from '../InferenceMemoryProfileTypes';
import type { NeuralBlueprintTaskSnapshot } from '../taskGuide/taskGuideSnapshot';
import type {
  ModuleAnalysisDirection,
  ModuleNodeData,
} from './ModuleBaseNodeTypes';
import { NeuralBlueprintCanvasInner } from './NeuralBlueprintCanvasInner';
import { NeuralBlueprintLeftPanel } from './NeuralBlueprintLeftPanel';
import { NeuralBlueprintRightPanel } from './NeuralBlueprintRightPanel';

interface NeuralBlueprintWorkspaceProp {
  fileId: string;
  features: ResolvedBlueprintTaskFeatureConfig['neuralBlueprint'];
  onInferenceMemoryProfileChange: (profile: InferenceMemoryProfile) => void;
  onTaskSnapshotChange?: (snapshot: NeuralBlueprintTaskSnapshot) => void;
  selectedInferenceModelId: string;
  setSelectedInferenceModelId: (modelId: string) => void;
}

export function NeuralBlueprintWorkspace({
  fileId,
  features,
  onInferenceMemoryProfileChange,
  onTaskSnapshotChange,
  selectedInferenceModelId,
  setSelectedInferenceModelId,
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
        onTaskSnapshotChange={onTaskSnapshotChange}
      />
      <NeuralBlueprintRightPanel
        analysisDirection={effectiveAnalysisDirection}
        features={features}
        selectedNode={selectedNode}
        selectedInferenceModelId={selectedInferenceModelId}
        showRankAnalysis={effectiveShowRankAnalysis}
        showVarianceAnalysis={effectiveShowVarianceAnalysis}
        setShowRankAnalysis={setShowRankAnalysis}
        setShowVarianceAnalysis={setShowVarianceAnalysis}
        setAnalysisDirection={setAnalysisDirection}
        setSelectedInferenceModelId={setSelectedInferenceModelId}
        setSelectedNode={setSelectedNode}
        onInferenceMemoryProfileChange={onInferenceMemoryProfileChange}
      />
    </>
  );
}
