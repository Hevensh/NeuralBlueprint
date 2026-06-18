import { useReactFlow, type Edge } from '@xyflow/react';
import { type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { updateState } from './analysis';
import { NeuralBlueprintModuleProperties } from './NeuralBlueprintModuleProperties';
import type {
  ModuleAnalysisDirection,
  ModuleBaseNode,
  ModuleBaseNodeData,
} from './ModuleBaseNodeTypes';

interface NeuralBlueprintRightPanelProp {
  analysisDirection: ModuleAnalysisDirection;
  selectedNode: ModuleBaseNodeData | null;
  showRankAnalysis: boolean;
  showVarianceAnalysis: boolean;
  setShowRankAnalysis: Dispatch<SetStateAction<boolean>>;
  setShowVarianceAnalysis: Dispatch<SetStateAction<boolean>>;
  setAnalysisDirection: Dispatch<SetStateAction<ModuleAnalysisDirection>>;
  setSelectedNode: Dispatch<SetStateAction<ModuleBaseNodeData | null>>;
}

export function NeuralBlueprintRightPanel({
  analysisDirection,
  selectedNode,
  showRankAnalysis,
  showVarianceAnalysis,
  setShowRankAnalysis,
  setShowVarianceAnalysis,
  setAnalysisDirection,
  setSelectedNode,
}: NeuralBlueprintRightPanelProp) {
  const { getNodes, setNodes } = useReactFlow<ModuleBaseNode, Edge>();

  const updateSelectedNode = (patch: Partial<ModuleBaseNodeData>) => {
    if (!selectedNode) return;

    const nextNodes = updateState(getNodes().map((node) => (
      node.id === selectedNode.id
        ? {
          ...node,
          data: {
            ...node.data,
            ...patch,
          },
        }
        : node
    )));
    const nextSelectedNode = nextNodes.find((node) => node.id === selectedNode.id)?.data ?? null;

    setNodes(nextNodes);
    setSelectedNode(nextSelectedNode);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelectedNode({ name: event.target.value });
  };

  const handleOutputDimChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rank = parseIntegerPropertyNumber(event.target.value);
    updateSelectedNode({
      stats: {
        ...selectedNode?.stats,
        rank,
        effectiveRank: selectedNode?.stats?.effectiveRank ?? rank,
        saturation: selectedNode?.stats?.saturation ?? 0,
        mean: selectedNode?.stats?.mean ?? Number.NaN,
        variance: selectedNode?.stats?.variance ?? Number.NaN,
        zeroRate: selectedNode?.stats?.zeroRate ?? Number.NaN,
        negativeRate: selectedNode?.stats?.negativeRate,
      },
    });
  };
  const selectedStats = analysisDirection === 'backward'
    ? selectedNode?.statsBackward
    : selectedNode?.stats;

  return (
    <aside
      className="right-panel"
      data-analysis-direction={analysisDirection}
    >
      <div className="title">Properties</div>
      <div className="top-bar-tabs property-direction-tabs">
        <button
          className={`top-bar-tab ${analysisDirection === 'forward' ? 'active' : ''}`}
          onClick={() => setAnalysisDirection('forward')}
          type="button"
        >
          Forward
        </button>
        <button
          className={`top-bar-tab ${analysisDirection === 'backward' ? 'active' : ''}`}
          onClick={() => setAnalysisDirection('backward')}
          type="button"
        >
          Backward
        </button>
      </div>
      <div className="property-toggle-group">
        <button
          className={`toggle-button ${showVarianceAnalysis ? 'active' : ''}`}
          onClick={() => setShowVarianceAnalysis((current) => !current)}
          type="button"
        >
          Variance Analysis
        </button>
        <button
          className={`toggle-button ${showRankAnalysis ? 'active' : ''}`}
          onClick={() => setShowRankAnalysis((current) => !current)}
          type="button"
        >
          Rank Analysis
        </button>
      </div>
      {selectedNode ? (
        <div className="property-panel">
          <label className="property-field">
            <span className="property-label">Name</span>
            <input
              className="property-input"
              value={selectedNode.name}
              onChange={handleNameChange}
            />
          </label>

          <div className="property-field">
            <span className="property-label">Type</span>
            <div className="property-value">{selectedNode.kind}</div>
          </div>

          <label className="property-field">
            <span className="property-label">Output Dim</span>
            <input
              className="property-input"
              value={formatIntegerPropertyNumber(selectedNode.stats?.rank)}
              onChange={handleOutputDimChange}
            />
          </label>

          {showRankAnalysis && (
            analysisDirection === 'backward' || selectedNode.kind !== 'Input'
          ) && (
            <label className="property-field">
              <span className="property-label">Effective Rank</span>
              <div className="property-value">
                {formatDecimalPropertyNumber(selectedStats?.effectiveRank, 3)}
              </div>
            </label>
          )}

          <NeuralBlueprintModuleProperties
            selectedNode={selectedNode}
            showRankAnalysis={
              showRankAnalysis && analysisDirection === 'forward'
            }
            updateSelectedNode={updateSelectedNode}
          />

          {showVarianceAnalysis && (
            <>
              <div className="property-field">
                <span className="property-label">
                  {analysisDirection === 'forward' ? 'Output Mean' : 'Gradient Mean'}
                </span>
                <div className="property-value">
                  {formatDecimalPropertyNumber(selectedStats?.mean, 3)}
                </div>
              </div>

              <div className="property-field">
                <span className="property-label">
                  {analysisDirection === 'forward'
                    ? 'Output Standard Error'
                    : 'Gradient Standard Error'}
                </span>
                <div className="property-value">
                  {formatDecimalPropertyNumber(
                    getStandardDeviation(selectedStats?.variance),
                    3,
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="property-empty">No node selected</div>
      )}
    </aside>
  );
}

function parseIntegerPropertyNumber(value: string) {
  return value.trim() === '' ? Number.NaN : Math.round(Number(value));
}

function formatIntegerPropertyNumber(value: number | undefined) {
  return typeof value === 'number' && !Number.isNaN(value) ? String(Math.round(value)) : '';
}

function formatDecimalPropertyNumber(value: number | undefined, digits: number) {
  return typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(digits) : '';
}

function getStandardDeviation(variance: number | undefined) {
  return typeof variance === 'number' && !Number.isNaN(variance)
    ? Math.sqrt(Math.max(variance, 0))
    : undefined;
}
