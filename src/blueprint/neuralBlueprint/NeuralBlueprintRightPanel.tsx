import { useNodes, useReactFlow, type Edge } from '@xyflow/react';
import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
} from 'react';
import type { InferenceMemoryProfile } from '../InferenceMemoryProfileTypes';
import { NumberField } from '../../NumberField';
import { buildInferenceMemoryProfile } from './analysis/inferenceMemoryProfile';
import { updateState } from './analysis/updateState';
import { InferenceMemoryChart } from './InferenceMemoryChart';
import { NeuralBlueprintModuleProperties } from './NeuralBlueprintModuleProperties';
import type {
  ModuleAnalysisDirection,
  ModuleBaseNode,
  ModuleNodeData,
} from './ModuleBaseNodeTypes';

interface NeuralBlueprintRightPanelProp {
  analysisDirection: ModuleAnalysisDirection;
  selectedNode: ModuleNodeData | null;
  showRankAnalysis: boolean;
  showVarianceAnalysis: boolean;
  setShowRankAnalysis: Dispatch<SetStateAction<boolean>>;
  setShowVarianceAnalysis: Dispatch<SetStateAction<boolean>>;
  setAnalysisDirection: Dispatch<SetStateAction<ModuleAnalysisDirection>>;
  setSelectedNode: Dispatch<SetStateAction<ModuleNodeData | null>>;
  onInferenceMemoryProfileChange: (profile: InferenceMemoryProfile) => void;
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
  onInferenceMemoryProfileChange,
}: NeuralBlueprintRightPanelProp) {
  const { getNodes, setNodes } = useReactFlow<ModuleBaseNode, Edge>();
  const nodes = useNodes<ModuleBaseNode>();
  const inferenceMemoryProfile = useMemo(
    () => buildInferenceMemoryProfile(nodes),
    [nodes],
  );
  useEffect(() => {
    onInferenceMemoryProfileChange(inferenceMemoryProfile);
  }, [inferenceMemoryProfile, onInferenceMemoryProfileChange]);

  const updateSelectedNode = <TNode extends ModuleNodeData>(
    nodeData: TNode,
    patch: Partial<TNode>,
  ) => {
    const nextNodes = updateState(getNodes().map((node) => (
      node.id === nodeData.id
        ? {
          ...node,
          data: {
            ...node.data,
            ...patch,
          } as ModuleNodeData,
        }
        : node
    )));
    const nextSelectedNode = nextNodes.find((node) => node.id === nodeData.id)?.data ?? null;

    setNodes(nextNodes);
    setSelectedNode(nextSelectedNode);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedNode) return;
    updateSelectedNode(selectedNode, { name: event.target.value });
  };

  const handleOutputDimChange = (value: number) => {
    if (!selectedNode || (
      selectedNode.kind !== 'Input'
      && selectedNode.kind !== 'Linear'
    )) return;

    const rank = Math.round(value);
    updateSelectedNode(selectedNode, {
      outFeatures: rank,
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

          {selectedNode.kind === 'Input' || selectedNode.kind === 'Linear' ? (
            <NumberField
              label="Output Dim"
              min={1}
              onChange={handleOutputDimChange}
              value={selectedNode.outFeatures}
            />
          ) : (
            <div className="property-field">
              <span className="property-label">Output Dim</span>
              <div className="property-value">
                {formatDecimalPropertyNumber(selectedNode.stats?.rank, 0)}
              </div>
            </div>
          )}

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
      <InferenceMemoryChart profile={inferenceMemoryProfile} />
    </aside>
  );
}

function formatDecimalPropertyNumber(value: number | undefined, digits: number) {
  return typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(digits) : '';
}

function getStandardDeviation(variance: number | undefined) {
  return typeof variance === 'number' && !Number.isNaN(variance)
    ? Math.sqrt(Math.max(variance, 0))
    : undefined;
}
