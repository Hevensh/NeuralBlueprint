import { NumberField } from '../../NumberField';
import { PropertyDropdown } from '../../PropertyDropdown';
import { useLabels } from '../../i18n/LanguageContext';
import type { AppLabelSet } from '../../i18n/label.en';
import type {
  BiasInitializationMode,
  DropoutNodeData,
  InputNodeData,
  InputNormalizationMode,
  LinearNodeData,
  LinearInitializationMode,
  ModuleNodeData,
} from './ModuleBaseNodeTypes';

interface NeuralBlueprintModulePropertiesProps {
  effectiveRankDisabled?: boolean;
  selectedNode: ModuleNodeData;
  showRankAnalysis: boolean;
  updateSelectedNode: UpdateSelectedNode;
}

type UpdateSelectedNode = <TNode extends ModuleNodeData>(
  node: TNode,
  patch: Partial<TNode>,
) => void;
type PropertyLabels = AppLabelSet['neuralBlueprint']['propertiesPanel'];

export function NeuralBlueprintModuleProperties({
  effectiveRankDisabled,
  selectedNode,
  showRankAnalysis,
  updateSelectedNode,
}: NeuralBlueprintModulePropertiesProps) {
  const labels = useLabels().neuralBlueprint.propertiesPanel;

  if (selectedNode.kind === 'Input') {
    return (
      <InputProperties
        effectiveRankDisabled={effectiveRankDisabled}
        labels={labels}
        node={selectedNode}
        showRankAnalysis={showRankAnalysis}
        updateNode={updateSelectedNode}
      />
    );
  }

  if (selectedNode.kind === 'Linear') {
    return (
      <LinearProperties
        labels={labels}
        node={selectedNode}
        updateNode={updateSelectedNode}
      />
    );
  }

  if (selectedNode.kind === 'Dropout') {
    return (
      <DropoutProperties
        labels={labels}
        node={selectedNode}
        updateNode={updateSelectedNode}
      />
    );
  }

  return null;
}

function InputProperties({
  effectiveRankDisabled,
  labels,
  node,
  showRankAnalysis,
  updateNode,
}: {
  effectiveRankDisabled?: boolean;
  labels: PropertyLabels;
  node: InputNodeData;
  showRankAnalysis: boolean;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <>
      {showRankAnalysis && (
        <NumberField
          disabled={effectiveRankDisabled}
          label={labels.effectiveRank}
          min={0}
          value={node.inputEffectiveRank}
          onChange={(inputEffectiveRank) => updateNode(node, {
            inputEffectiveRank: Math.round(inputEffectiveRank),
          })}
        />
      )}

      <div className="property-field">
        <span className="property-label">{labels.normalization}</span>
        <PropertyDropdown<InputNormalizationMode>
          options={[
            { label: '0-1', value: '0-1' },
            { label: labels.standard, value: 'standard' },
          ]}
          value={node.normalizationMode}
          onChange={(normalizationMode) => updateNode(node, { normalizationMode })}
        />
      </div>
    </>
  );
}

function LinearProperties({
  labels,
  node,
  updateNode,
}: {
  labels: PropertyLabels;
  node: LinearNodeData;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <>
      <div className="property-field">
        <span className="property-label">{labels.weightInitialization}</span>
        <PropertyDropdown<LinearInitializationMode>
          options={[
            { label: labels.standardNormal, value: 'standard_normal' },
            { label: labels.xavierNormal, value: 'xavier_normal' },
          ]}
          value={node.initializationMode}
          onChange={(initializationMode) => updateNode(node, { initializationMode })}
        />
      </div>

      <div className="property-field">
        <span className="property-label">{labels.biasInitialization}</span>
        <PropertyDropdown<BiasInitializationMode>
          options={[
            { label: labels.zeros, value: 'zeros' },
            { label: labels.standardNormal, value: 'standard_normal' },
          ]}
          value={node.biasInitializationMode}
          onChange={(biasInitializationMode) => updateNode(node, {
            biasInitializationMode,
          })}
        />
      </div>
    </>
  );
}

function DropoutProperties({
  labels,
  node,
  updateNode,
}: {
  labels: PropertyLabels;
  node: DropoutNodeData;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <NumberField
      label={labels.dropoutRate}
      max={100}
      min={0}
      value={node.dropoutRate * 100}
      onChange={(dropoutRate) => updateNode(node, {
        dropoutRate: dropoutRate / 100,
      })}
    />
  );
}
