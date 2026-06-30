import { useCallback, useState } from 'react';
import { loadNeuralBlueprintUi } from '../../dataStorage/neuralBlueprintStorage';
import type { ResolvedBlueprintTaskFeatureConfig } from '../../taskData/blueprintFeatureConfig';
import type {
  InferenceMemoryAggregationPair,
  InferenceMemoryProfile,
} from '../InferenceMemoryProfileTypes';
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
  const [activeInferenceFocus, setActiveInferenceFocus] =
    useState<InferenceMemoryFocus | null>(null);
  const [showVarianceAnalysis, setShowVarianceAnalysis] = useState(initialUi.showVarianceAnalysis);
  const [showRankAnalysis, setShowRankAnalysis] = useState(initialUi.showRankAnalysis);
  const [analysisDirection, setAnalysisDirection] = useState<ModuleAnalysisDirection>(
    initialUi.analysisDirection,
  );
  const [arrangeRequest, setArrangeRequest] = useState(0);
  const updateActiveInferenceFocus = useCallback((
    focus: InferenceMemoryFocus | null,
  ) => {
    setActiveInferenceFocus((current) => (
      sameInferenceFocus(current, focus) ? current : focus
    ));
  }, []);
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
        activeInferenceAggregationPairs={
          activeInferenceFocus?.aggregationPairs ?? []
        }
        activeInferenceNodeIds={activeInferenceFocus?.nodeIds ?? []}
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
        onActiveInferenceFocusChange={updateActiveInferenceFocus}
        onInferenceMemoryProfileChange={onInferenceMemoryProfileChange}
      />
    </>
  );
}

interface InferenceMemoryFocus {
  nodeIds: string[];
  aggregationPairs: InferenceMemoryAggregationPair[];
}

function sameInferenceFocus(
  left: InferenceMemoryFocus | null,
  right: InferenceMemoryFocus | null,
) {
  if (!left || !right) return left === right;
  return sameStringArray(left.nodeIds, right.nodeIds)
    && left.aggregationPairs.length === right.aggregationPairs.length
    && left.aggregationPairs.every((pair, index) => (
      pair.leftNodeId === right.aggregationPairs[index]?.leftNodeId
      && pair.rightNodeId === right.aggregationPairs[index]?.rightNodeId
      && pair.rho === right.aggregationPairs[index]?.rho
      && pair.leftWeight === right.aggregationPairs[index]?.leftWeight
      && pair.rightWeight === right.aggregationPairs[index]?.rightWeight
    ));
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}
