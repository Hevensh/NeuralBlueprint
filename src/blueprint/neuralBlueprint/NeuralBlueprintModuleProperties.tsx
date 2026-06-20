import { NumberField } from '../../NumberField';
import { PropertyDropdown } from '../../PropertyDropdown';
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
  selectedNode: ModuleNodeData;
  showRankAnalysis: boolean;
  updateSelectedNode: UpdateSelectedNode;
}

type UpdateSelectedNode = <TNode extends ModuleNodeData>(
  node: TNode,
  patch: Partial<TNode>,
) => void;

export function NeuralBlueprintModuleProperties({
  selectedNode,
  showRankAnalysis,
  updateSelectedNode,
}: NeuralBlueprintModulePropertiesProps) {
  if (selectedNode.kind === 'Input') {
    return (
      <InputProperties
        node={selectedNode}
        showRankAnalysis={showRankAnalysis}
        updateNode={updateSelectedNode}
      />
    );
  }

  if (selectedNode.kind === 'Linear') {
    return <LinearProperties node={selectedNode} updateNode={updateSelectedNode} />;
  }

  if (selectedNode.kind === 'Dropout') {
    return <DropoutProperties node={selectedNode} updateNode={updateSelectedNode} />;
  }

  return null;
}

function InputProperties({
  node,
  showRankAnalysis,
  updateNode,
}: {
  node: InputNodeData;
  showRankAnalysis: boolean;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <>
      {showRankAnalysis && (
        <NumberField
          label="Effective Rank"
          min={0}
          value={node.inputEffectiveRank}
          onChange={(inputEffectiveRank) => updateNode(node, {
            inputEffectiveRank: Math.round(inputEffectiveRank),
          })}
        />
      )}

      <div className="property-field">
        <span className="property-label">Normalization</span>
        <PropertyDropdown<InputNormalizationMode>
          options={[
            { label: '0-1', value: '0-1' },
            { label: 'Standard', value: 'standard' },
          ]}
          value={node.normalizationMode}
          onChange={(normalizationMode) => updateNode(node, { normalizationMode })}
        />
      </div>
    </>
  );
}

function LinearProperties({
  node,
  updateNode,
}: {
  node: LinearNodeData;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <>
      <div className="property-field">
        <span className="property-label">Weight Initialization</span>
        <PropertyDropdown<LinearInitializationMode>
          options={[
            { label: 'Standard Normal', value: 'standard_normal' },
            { label: 'Xavier Normal', value: 'xavier_normal' },
          ]}
          value={node.initializationMode}
          onChange={(initializationMode) => updateNode(node, { initializationMode })}
        />
      </div>

      <div className="property-field">
        <span className="property-label">Bias Initialization</span>
        <PropertyDropdown<BiasInitializationMode>
          options={[
            { label: 'Zeros', value: 'zeros' },
            { label: 'Standard Normal', value: 'standard_normal' },
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
  node,
  updateNode,
}: {
  node: DropoutNodeData;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <NumberField
      label="Dropout Rate (%)"
      max={100}
      min={0}
      value={node.dropoutRate * 100}
      onChange={(dropoutRate) => updateNode(node, {
        dropoutRate: dropoutRate / 100,
      })}
    />
  );
}
