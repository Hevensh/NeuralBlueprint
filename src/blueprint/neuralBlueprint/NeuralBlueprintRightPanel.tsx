import { useReactFlow, type Edge } from '@xyflow/react';
import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { ResolvedBlueprintTaskFeatureConfig } from '../../taskData/blueprintFeatureConfig';
import { NumberField } from '../../NumberField';
import { useLabels } from '../../i18n/useLanguage';
import { updateState } from './analysis/updateState';
import { NeuralBlueprintModuleProperties } from './NeuralBlueprintModuleProperties';
import type {
  ModuleAnalysisDirection,
  ModuleBaseNode,
  ModuleLockedProperty,
  ModuleNodeData,
  ModuleTensorShape,
  ModuleDimension,
  SpatialViewStats,
} from './ModuleBaseNodeTypes';

interface NeuralBlueprintRightPanelProp {
  analysisDirection: ModuleAnalysisDirection;
  features: ResolvedBlueprintTaskFeatureConfig['neuralBlueprint'];
  selectedNode: ModuleNodeData | null;
  showRankAnalysis: boolean;
  showVarianceAnalysis: boolean;
  showRepetitionAnalysis: boolean;
  showDistanceIndexAnalysis: boolean;
  setShowRankAnalysis: Dispatch<SetStateAction<boolean>>;
  setShowVarianceAnalysis: Dispatch<SetStateAction<boolean>>;
  setShowRepetitionAnalysis: Dispatch<SetStateAction<boolean>>;
  setShowDistanceIndexAnalysis: Dispatch<SetStateAction<boolean>>;
  setAnalysisDirection: Dispatch<SetStateAction<ModuleAnalysisDirection>>;
  setSelectedNode: Dispatch<SetStateAction<ModuleNodeData | null>>;
}

export function NeuralBlueprintRightPanel({
  analysisDirection,
  features,
  selectedNode,
  showRankAnalysis,
  showVarianceAnalysis,
  showRepetitionAnalysis,
  showDistanceIndexAnalysis,
  setShowRankAnalysis,
  setShowVarianceAnalysis,
  setShowRepetitionAnalysis,
  setShowDistanceIndexAnalysis,
  setAnalysisDirection,
  setSelectedNode,
}: NeuralBlueprintRightPanelProp) {
  const allLabels = useLabels();
  const labels = allLabels.neuralBlueprint;
  const propertyLabels = labels.propertiesPanel;
  const analysisLabels = labels.analysisControls;
  const { getNodes, setNodes } = useReactFlow<ModuleBaseNode, Edge>();
  const updateSelectedNode = <TNode extends ModuleNodeData>(
    nodeData: TNode,
    patch: Partial<TNode>,
  ) => {
    if (hasLockedPatch(nodeData, patch)) return;

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
      && selectedNode.kind !== '3DInput'
      && selectedNode.kind !== 'Linear'
      && selectedNode.kind !== 'CNN'
      && selectedNode.kind !== 'ResNetStage'
      && selectedNode.kind !== 'PatchEmbedding'
    )) return;

    const rank = Math.round(value);
    updateSelectedNode(selectedNode, {
      outFeatures: rank,
    });
  };

  const handleNeededOutputDimChange = (value: number) => {
    if (!selectedNode || selectedNode.kind !== 'Output') return;

    updateSelectedNode(selectedNode, {
      neededOutputDim: Math.round(value),
    });
  };
  const selectedStats = analysisDirection === 'backward'
    ? selectedNode?.statsBackward
    : selectedNode?.stats;
  const outputDimLocked = isPropertyLocked(selectedNode, 'outFeatures');
  const effectiveRankLocked = isPropertyLocked(
    selectedNode,
    'inputEffectiveRank',
  );
  const neededOutputDimLocked = isPropertyLocked(
    selectedNode,
    'neededOutputDim',
  );
  const showAnyAnalysisControl = features.showBackwardAnalysisControl
    || features.showRankAnalysisToggle
    || features.showVarianceAnalysisToggle
    || features.showRepetitionAnalysisToggle
    || features.showDistanceIndexAnalysisToggle;

  return (
    <aside
      className="right-panel"
      data-analysis-direction={analysisDirection}
    >
      <div className="title">{propertyLabels.title}</div>
      {showAnyAnalysisControl && <div className="property-toggle-group">
        {features.showBackwardAnalysisControl && (
          <div className="top-bar-tabs property-direction-tabs">
            <button
              className={`top-bar-tab ${analysisDirection === 'forward' ? 'active' : ''}`}
              onClick={() => setAnalysisDirection('forward')}
              type="button"
            >
              {analysisLabels.forward}
            </button>
            <button
              className={`top-bar-tab ${analysisDirection === 'backward' ? 'active' : ''}`}
              onClick={() => setAnalysisDirection('backward')}
              type="button"
            >
              {analysisLabels.backward}
            </button>
          </div>
        )}
        {features.showRankAnalysisToggle && (
          <button
            className={`toggle-button ${showRankAnalysis ? 'active' : ''}`}
            onClick={() => setShowRankAnalysis((current) => !current)}
            type="button"
          >
            {analysisLabels.rankAnalysis}
          </button>
        )}
        {features.showVarianceAnalysisToggle && (
          <button
            className={`toggle-button ${showVarianceAnalysis ? 'active' : ''}`}
            onClick={() => setShowVarianceAnalysis((current) => !current)}
            type="button"
          >
            {analysisLabels.varianceAnalysis}
          </button>
        )}
        {features.showRepetitionAnalysisToggle && (
          <button
            className={`toggle-button ${showRepetitionAnalysis ? 'active' : ''}`}
            onClick={() => setShowRepetitionAnalysis((current) => !current)}
            type="button"
          >
            {analysisLabels.repetitionAnalysis}
          </button>
        )}
        {features.showDistanceIndexAnalysisToggle && (
          <button
            className={`toggle-button ${showDistanceIndexAnalysis ? 'active' : ''}`}
            onClick={() => setShowDistanceIndexAnalysis((current) => !current)}
            type="button"
          >
            {analysisLabels.distanceIndexAnalysis}
          </button>
        )}
      </div>}
      {selectedNode ? (
        <div className="property-panel">
          <label className="property-field">
            <span className="property-label">{propertyLabels.name}</span>
            <input
              className="property-input"
              value={selectedNode.name}
              onChange={handleNameChange}
            />
          </label>

          <div className="property-field">
            <span className="property-label">{propertyLabels.type}</span>
            <div className="property-value">{selectedNode.kind}</div>
          </div>

          {selectedNode.kind === 'Input' || selectedNode.kind === '3DInput' || selectedNode.kind === 'Linear' || selectedNode.kind === 'CNN' || selectedNode.kind === 'ResNetStage' || selectedNode.kind === 'PatchEmbedding' ? (
            <NumberField
              label={propertyLabels.outputDim}
              disabled={outputDimLocked}
              guideTarget="property-output-dim"
              min={1}
              onChange={handleOutputDimChange}
              value={selectedNode.outFeatures}
            />
          ) : selectedNode.kind === 'Output' ? (
            <NumberField
              label={propertyLabels.neededOutputDim}
              disabled={neededOutputDimLocked}
              min={1}
              onChange={handleNeededOutputDimChange}
              value={selectedNode.neededOutputDim}
            />
          ) : (
            <div className="property-field">
              <span className="property-label">{propertyLabels.outputDim}</span>
              <div className="property-value">
                {formatDecimalPropertyNumber(
                  selectedNode.stats?.rank.outputRank,
                  0,
                )}
              </div>
            </div>
          )}

          <div className="property-field">
            <span className="property-label">{propertyLabels.shape}</span>
            <div className="property-value">{formatShape(selectedNode.stats?.shape)}</div>
          </div>

          {showRankAnalysis && (
            analysisDirection === 'backward' || selectedNode.kind !== 'Input'
          ) && (
              <label className="property-field">
                <span className="property-label">
                  {propertyLabels.effectiveRank}
                </span>
                <div className="property-value">
                  {formatDecimalPropertyNumber(
                    selectedStats?.rank.effectiveRank,
                    3,
                  )}
                </div>
              </label>
            )}

          {showRepetitionAnalysis && analysisDirection === 'forward' && (
            <>
              <div className="property-field">
                <span className="property-label">{propertyLabels.viewReach}</span>
                <div className="property-value">
                  {formatSpatialReach(selectedNode.stats?.spatialView)}
                </div>
              </div>
              <div className="property-field">
                <span className="property-label">{propertyLabels.viewRank}</span>
                <div className="property-value">
                  {formatDecimalPropertyNumber(
                    selectedNode.stats?.spatialView.viewRank,
                    0,
                  )}
                </div>
              </div>
              {selectedNode.stats?.spatialView.patchFrame && (
                <div className="property-field">
                  <span className="property-label">{propertyLabels.patchGrid}</span>
                  <div className="property-value">
                    {formatSpatialGrid(selectedNode.stats.spatialView)}
                  </div>
                </div>
              )}
            </>
          )}

          <NeuralBlueprintModuleProperties
            effectiveRankDisabled={effectiveRankLocked}
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
                  {analysisDirection === 'forward'
                    ? propertyLabels.outputMean
                    : propertyLabels.gradientMean}
                </span>
                <div className="property-value">
                  {formatDecimalPropertyNumber(
                    selectedStats?.distribution.mean,
                    3,
                  )}
                </div>
              </div>

              <div className="property-field">
                <span className="property-label">
                  {analysisDirection === 'forward'
                    ? propertyLabels.outputStandardError
                    : propertyLabels.gradientStandardError}
                </span>
                <div className="property-value">
                  {formatDecimalPropertyNumber(
                    getStandardDeviation(
                      selectedStats?.distribution.variance,
                    ),
                    3,
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="property-empty">{propertyLabels.noNodeSelected}</div>
      )}
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

function formatShape(shape: ModuleTensorShape | undefined) {
  if (!shape) return '';
  return ([
    ['T', shape.time],
    ['C', shape.channels],
    ['H', shape.height],
    ['W', shape.width],
  ] as const)
    .filter(([, value]) => value !== 'absent')
    .map(([, value]) => formatShapeDimension(value))
    .join(' × ');
}

function formatShapeDimension(dimension: ModuleDimension) {
  if (dimension === 'unknown') return '?';
  if (dimension === 'absent') return '';
  return String(dimension);
}

function formatSpatialReach(view: SpatialViewStats | undefined) {
  if (!view) return '';
  return ['time', 'height', 'width']
    .map((axis) => view.axes[axis as keyof SpatialViewStats['axes']])
    .filter((axis) => axis.positions !== 'absent')
    .map((axis) => formatShapeDimension(axis.reach))
    .join(' × ');
}

function formatSpatialGrid(view: SpatialViewStats) {
  return ['time', 'height', 'width']
    .map((axis) => view.axes[axis as keyof SpatialViewStats['axes']])
    .filter((axis) => axis.positions !== 'absent')
    .map((axis) => formatShapeDimension(axis.positions))
    .join(' × ');
}

function hasLockedPatch<TNode extends ModuleNodeData>(
  node: TNode,
  patch: Partial<TNode>,
) {
  const locked = node.locked?.properties ?? [];
  return Object.keys(patch).some((key) => (
    locked.includes(dataFieldToLockedProperty(key))
  ));
}

function dataFieldToLockedProperty(field: string): ModuleLockedProperty {
  return field as ModuleLockedProperty;
}

function isPropertyLocked(
  node: ModuleNodeData | null,
  property: ModuleLockedProperty,
) {
  return Boolean(node?.locked?.properties?.includes(property));
}
