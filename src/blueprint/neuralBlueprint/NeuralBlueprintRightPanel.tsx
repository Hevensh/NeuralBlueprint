import { useReactFlow, type Edge } from '@xyflow/react';
import { type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { PropertyDropdown } from '../../PropertyDropdown';
import { updateState } from './analysis';
import type {
  BiasInitializationMode,
  InputNormalizationMode,
  LinearInitializationMode,
  ModuleBaseNode,
  ModuleBaseNodeData,
} from './ModuleBaseNodeTypes';

interface NeuralBlueprintRightPanelProp {
  selectedNode: ModuleBaseNodeData | null;
  showRankAnalysis: boolean;
  showVarianceAnalysis: boolean;
  setShowRankAnalysis: Dispatch<SetStateAction<boolean>>;
  setShowVarianceAnalysis: Dispatch<SetStateAction<boolean>>;
  setSelectedNode: Dispatch<SetStateAction<ModuleBaseNodeData | null>>;
}

export function NeuralBlueprintRightPanel({
  selectedNode,
  showRankAnalysis,
  showVarianceAnalysis,
  setShowRankAnalysis,
  setShowVarianceAnalysis,
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

  const handleEffectiveRankChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelectedNode({
      stats: {
        ...selectedNode?.stats,
        rank: selectedNode?.stats?.rank ?? 64,
        effectiveRank: parseIntegerPropertyNumber(event.target.value),
        saturation: selectedNode?.stats?.saturation ?? 0,
        mean: selectedNode?.stats?.mean ?? Number.NaN,
        variance: selectedNode?.stats?.variance ?? Number.NaN,
        zeroRate: selectedNode?.stats?.zeroRate ?? Number.NaN,
        negativeRate: selectedNode?.stats?.negativeRate,
      },
    });
  };

  return (
    <aside className="right-panel">
      <div className="title">Properties</div>
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
            <label className="property-field">
              <span className="property-label">Effective Rank</span>
              {selectedNode.kind === 'Input' ? (
                <input
                  className="property-input"
                  value={formatIntegerPropertyNumber(selectedNode.stats?.effectiveRank)}
                  onChange={handleEffectiveRankChange}
                />
              ) : (
                <div className="property-value">
                  {formatDecimalPropertyNumber(selectedNode.stats?.effectiveRank, 3)}
                </div>
              )}
            </label>
          )}

          {selectedNode.kind === 'Input' && (
            <div className="property-field">
              <span className="property-label">Normalization</span>
              <PropertyDropdown<InputNormalizationMode>
                options={[
                  { label: '0-1', value: '0-1' },
                  { label: 'Standard', value: 'standard' },
                ]}
                value={selectedNode.normalizationMode ?? '0-1'}
                onChange={(normalizationMode) => updateSelectedNode({ normalizationMode })}
              />
            </div>
          )}

          {selectedNode.kind === 'Linear' && (
            <>
              <div className="property-field">
                <span className="property-label">Weight Initialization</span>
                <PropertyDropdown<LinearInitializationMode>
                  options={[
                    { label: 'Standard Normal', value: 'standard_normal' },
                    { label: 'Xavier Normal', value: 'xavier_normal' },
                  ]}
                  value={selectedNode.initializationMode ?? 'xavier_normal'}
                  onChange={(initializationMode) => updateSelectedNode({ initializationMode })}
                />
              </div>

              <div className="property-field">
                <span className="property-label">Bias Initialization</span>
                <PropertyDropdown<BiasInitializationMode>
                  options={[
                    { label: 'Zeros', value: 'zeros' },
                    { label: 'Standard Normal', value: 'standard_normal' },
                  ]}
                  value={selectedNode.biasInitializationMode ?? 'zeros'}
                  onChange={(biasInitializationMode) => updateSelectedNode({ biasInitializationMode })}
                />
              </div>
            </>
          )}

          {showVarianceAnalysis && (
            <>
              <div className="property-field">
                <span className="property-label">Output Mean</span>
                <div className="property-value">
                  {formatDecimalPropertyNumber(selectedNode.stats?.mean, 3)}
                </div>
              </div>

              <div className="property-field">
                <span className="property-label">Output Standard Error</span>
                <div className="property-value">
                  {formatDecimalPropertyNumber(getOutputStandardError(selectedNode), 3)}
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

function getOutputStandardError(node: ModuleBaseNodeData) {
  const variance = node.stats?.variance;
  return typeof variance === 'number' && !Number.isNaN(variance)
    ? Math.sqrt(Math.max(variance, 0))
    : undefined;
}
