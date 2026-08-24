import { useNodes } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadNeuralBlueprintUi } from '../../dataStorage/neuralBlueprintStorage';
import type { ResolvedBlueprintTaskFeatureConfig } from '../../taskData/blueprintFeatureConfig';
import type {
  InferenceMemoryAggregationPair,
  InferenceMemoryProfile,
} from '../InferenceMemoryProfileTypes';
import { EMPTY_INFERENCE_MEMORY_PROFILE } from '../InferenceMemoryProfileTypes';
import {
  SPATIAL_AXES,
  type SpatialAxis,
} from '../SpatialAdaptationTypes';
import type { NeuralBlueprintTaskSnapshot } from '../taskGuide/taskGuideSnapshot';
import type {
  ModuleAnalysisDirection,
  ModuleBaseNode,
  ModuleNodeData,
} from './ModuleBaseNodeTypes';
import { buildInferenceMemoryModels } from './analysis/inferenceMemoryProfile';
import { InferenceMemorySelector } from './InferenceMemorySelector';
import { NeuralBlueprintCanvasInner } from './NeuralBlueprintCanvasInner';
import { NeuralBlueprintLeftPanel } from './NeuralBlueprintLeftPanel';
import { NeuralBlueprintRightPanel } from './NeuralBlueprintRightPanel';

const EMPTY_INFERENCE_NODE_IDS: string[] = [];
const EMPTY_INFERENCE_AGGREGATION_PAIRS: InferenceMemoryAggregationPair[] = [];

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
  const nodes = useNodes<ModuleBaseNode>();
  const [selectedNode, setSelectedNode] = useState<ModuleNodeData | null>(null);
  const [activeInferenceFocus, setActiveInferenceFocus] =
    useState<InferenceMemoryFocus | null>(null);
  const [showVarianceAnalysis, setShowVarianceAnalysis] = useState(initialUi.showVarianceAnalysis);
  const [showRankAnalysis, setShowRankAnalysis] = useState(initialUi.showRankAnalysis);
  const [showRepetitionAnalysis, setShowRepetitionAnalysis] = useState(initialUi.showRepetitionAnalysis);
  const [showDistanceIndexAnalysis, setShowDistanceIndexAnalysis] = useState(
    initialUi.showDistanceIndexAnalysis,
  );
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
  const effectiveShowRepetitionAnalysis = features.showRepetitionAnalysisToggle
    && showRepetitionAnalysis;
  const effectiveShowDistanceIndexAnalysis =
    features.showDistanceIndexAnalysisToggle && showDistanceIndexAnalysis;
  const inferenceMemoryModels = useMemo(
    () => buildInferenceMemoryModels(nodes),
    [nodes],
  );
  const effectiveInferenceModelId = inferenceMemoryModels.some((model) => (
    model.id === selectedInferenceModelId
  ))
    ? selectedInferenceModelId
    : inferenceMemoryModels[0]?.id ?? '';
  const inferenceMemoryProfile = inferenceMemoryModels.find((model) => (
    model.id === effectiveInferenceModelId
  ))?.profile ?? EMPTY_INFERENCE_MEMORY_PROFILE;
  const selectedInferenceModel = inferenceMemoryModels.find((model) => (
    model.id === effectiveInferenceModelId
  ));
  const inferenceSpatialAxes = useMemo(
    () => getInferenceSpatialAxes(nodes, selectedInferenceModel?.sourceNodeIds),
    [nodes, selectedInferenceModel?.sourceNodeIds],
  );
  const showInferenceScale = effectiveShowRepetitionAnalysis
    && inferenceSpatialAxes.length > 0;
  const showInferenceIndex = effectiveShowDistanceIndexAnalysis
    && inferenceSpatialAxes.length > 0;
  const showInferenceMemorySelector = effectiveShowRankAnalysis
    || effectiveShowVarianceAnalysis
    || showInferenceScale
    || showInferenceIndex;

  useEffect(() => {
    onInferenceMemoryProfileChange(inferenceMemoryProfile);
  }, [inferenceMemoryProfile, onInferenceMemoryProfileChange]);

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
          activeInferenceFocus?.aggregationPairs
            ?? EMPTY_INFERENCE_AGGREGATION_PAIRS
        }
        activeInferenceNodeIds={
          activeInferenceFocus?.nodeIds ?? EMPTY_INFERENCE_NODE_IDS
        }
        showRankAnalysis={effectiveShowRankAnalysis}
        showVarianceAnalysis={effectiveShowVarianceAnalysis}
        showRepetitionAnalysis={effectiveShowRepetitionAnalysis}
        showDistanceIndexAnalysis={effectiveShowDistanceIndexAnalysis}
        topOverlay={showInferenceMemorySelector ? (
          <InferenceMemorySelector
            modelOptions={inferenceMemoryModels.map((model) => ({
              id: model.id,
              label: model.label,
            }))}
            onActiveGroupFocusChange={updateActiveInferenceFocus}
            onModelChange={setSelectedInferenceModelId}
            profile={inferenceMemoryProfile}
            selectedModelId={effectiveInferenceModelId}
            showIndex={showInferenceIndex}
            showMemory={effectiveShowRankAnalysis}
            showScale={showInferenceScale}
            showVariance={effectiveShowVarianceAnalysis}
            spatialAxes={inferenceSpatialAxes}
          />
        ) : null}
        setSelectedNode={setSelectedNode}
        onTaskSnapshotChange={onTaskSnapshotChange}
      />
      <NeuralBlueprintRightPanel
        analysisDirection={effectiveAnalysisDirection}
        features={features}
        selectedNode={selectedNode}
        showRankAnalysis={effectiveShowRankAnalysis}
        showVarianceAnalysis={effectiveShowVarianceAnalysis}
        showRepetitionAnalysis={effectiveShowRepetitionAnalysis}
        showDistanceIndexAnalysis={effectiveShowDistanceIndexAnalysis}
        setShowRankAnalysis={setShowRankAnalysis}
        setShowVarianceAnalysis={setShowVarianceAnalysis}
        setShowRepetitionAnalysis={setShowRepetitionAnalysis}
        setShowDistanceIndexAnalysis={setShowDistanceIndexAnalysis}
        setAnalysisDirection={setAnalysisDirection}
        setSelectedNode={setSelectedNode}
      />
    </>
  );
}

function getInferenceSpatialAxes(
  nodes: ModuleBaseNode[],
  sourceNodeIds: string[] | undefined,
): SpatialAxis[] {
  const sourceNodeIdSet = new Set(sourceNodeIds ?? []);
  const sourceShapes = nodes
    .filter((node) => sourceNodeIdSet.has(node.id))
    .map((node) => node.data.stats?.shape)
    .filter((shape) => shape !== undefined);

  return SPATIAL_AXES.filter((axis) => sourceShapes.some(
    (shape) => shape[axis] !== 'absent',
  ));
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
