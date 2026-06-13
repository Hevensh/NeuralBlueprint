import { useState } from 'react';
import { loadNeuralBlueprintUi } from '../../dataStorage/neuralBlueprintStorage';
import type { ModuleBaseNodeData } from './ModuleBaseNodeTypes';
import { NeuralBlueprintCanvasInner } from './NeuralBlueprintCanvasInner';
import { NeuralBlueprintLeftPanel } from './NeuralBlueprintLeftPanel';
import { NeuralBlueprintRightPanel } from './NeuralBlueprintRightPanel';

interface NeuralBlueprintWorkspaceProp {
  fileId: string;
}

export function NeuralBlueprintWorkspace({ fileId }: NeuralBlueprintWorkspaceProp) {
  const [initialUi] = useState(() => loadNeuralBlueprintUi(fileId));
  const [selectedNode, setSelectedNode] = useState<ModuleBaseNodeData | null>(null);
  const [showVarianceAnalysis, setShowVarianceAnalysis] = useState(initialUi.showVarianceAnalysis);
  const [showRankAnalysis, setShowRankAnalysis] = useState(initialUi.showRankAnalysis);

  return (
    <>
      <NeuralBlueprintLeftPanel />
      <NeuralBlueprintCanvasInner
        fileId={fileId}
        showRankAnalysis={showRankAnalysis}
        showVarianceAnalysis={showVarianceAnalysis}
        setSelectedNode={setSelectedNode}
      />
      <NeuralBlueprintRightPanel
        selectedNode={selectedNode}
        showRankAnalysis={showRankAnalysis}
        showVarianceAnalysis={showVarianceAnalysis}
        setShowRankAnalysis={setShowRankAnalysis}
        setShowVarianceAnalysis={setShowVarianceAnalysis}
        setSelectedNode={setSelectedNode}
      />
    </>
  );
}
