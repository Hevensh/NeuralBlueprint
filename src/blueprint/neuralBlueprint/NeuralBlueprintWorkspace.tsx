import { useState } from 'react';
import { loadNeuralBlueprintUi } from '../../dataStorage/neuralBlueprintStorage';
import type {
  ModuleAnalysisDirection,
  ModuleNodeData,
} from './ModuleBaseNodeTypes';
import { NeuralBlueprintCanvasInner } from './NeuralBlueprintCanvasInner';
import { NeuralBlueprintLeftPanel } from './NeuralBlueprintLeftPanel';
import { NeuralBlueprintRightPanel } from './NeuralBlueprintRightPanel';

interface NeuralBlueprintWorkspaceProp {
  fileId: string;
}

export function NeuralBlueprintWorkspace({ fileId }: NeuralBlueprintWorkspaceProp) {
  const [initialUi] = useState(() => loadNeuralBlueprintUi(fileId));
  const [selectedNode, setSelectedNode] = useState<ModuleNodeData | null>(null);
  const [showVarianceAnalysis, setShowVarianceAnalysis] = useState(initialUi.showVarianceAnalysis);
  const [showRankAnalysis, setShowRankAnalysis] = useState(initialUi.showRankAnalysis);
  const [analysisDirection, setAnalysisDirection] = useState<ModuleAnalysisDirection>(
    initialUi.analysisDirection,
  );
  const [arrangeRequest, setArrangeRequest] = useState(0);

  return (
    <>
      <NeuralBlueprintLeftPanel onArrangeNodes={() => setArrangeRequest((request) => request + 1)} />
      <NeuralBlueprintCanvasInner
        arrangeRequest={arrangeRequest}
        analysisDirection={analysisDirection}
        fileId={fileId}
        showRankAnalysis={showRankAnalysis}
        showVarianceAnalysis={showVarianceAnalysis}
        setSelectedNode={setSelectedNode}
      />
      <NeuralBlueprintRightPanel
        analysisDirection={analysisDirection}
        selectedNode={selectedNode}
        showRankAnalysis={showRankAnalysis}
        showVarianceAnalysis={showVarianceAnalysis}
        setShowRankAnalysis={setShowRankAnalysis}
        setShowVarianceAnalysis={setShowVarianceAnalysis}
        setAnalysisDirection={setAnalysisDirection}
        setSelectedNode={setSelectedNode}
      />
    </>
  );
}
