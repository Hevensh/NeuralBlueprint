import { NumberField } from '../../NumberField';
import { PropertyDropdown } from '../../PropertyDropdown';
import { useLabels } from '../../i18n/LanguageContext';
import type { AppLabelSet } from '../../i18n/label.en';
import type {
  BiasInitializationMode,
  CNNNodeData,
  DropoutNodeData,
  InputNodeData,
  InputNormalizationMode,
  LinearNodeData,
  LinearInitializationMode,
  ModuleNodeData,
  ModuleDimension,
  PoolMode,
  PoolingNodeData,
  ThreeDInputNodeData,
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

  if (selectedNode.kind === 'Input' || selectedNode.kind === '3DInput') {
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

  if (selectedNode.kind === 'CNN') {
    return (
      <CNNProperties labels={labels} node={selectedNode} updateNode={updateSelectedNode} />
    );
  }

  if (selectedNode.kind === 'Pooling') {
    return (
      <PoolingProperties labels={labels} node={selectedNode} updateNode={updateSelectedNode} />
    );
  }

  if (selectedNode.kind === 'GlobalPooling') {
    return (
      <GlobalPoolingProperties
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
  node: InputNodeData | ThreeDInputNodeData;
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

      {node.kind === '3DInput' && (
        <div className="property-field-pair">
          <SpatialDimensionField
            label={labels.height}
            value={node.height}
            onChange={(height) => updateNode(node, { height })}
          />
          <SpatialDimensionField
            label={labels.width}
            value={node.width}
            onChange={(width) => updateNode(node, { width })}
          />
        </div>
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

function CNNProperties({
  labels,
  node,
  updateNode,
}: {
  labels: PropertyLabels;
  node: CNNNodeData;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <>
      <LinearProperties labels={labels} node={node} updateNode={updateNode} />
      <PositiveIntegerField label={labels.kernelSize} value={node.kernelSize} onChange={(kernelSize) => updateNode(node, { kernelSize })} />
      <PositiveIntegerField label={labels.stride} value={node.stride} onChange={(stride) => updateNode(node, { stride })} />
      <NonNegativeIntegerField label={labels.padding} value={node.padding} onChange={(padding) => updateNode(node, { padding })} />
      <PositiveIntegerField label={labels.dilation} value={node.dilation} onChange={(dilation) => updateNode(node, { dilation })} />
    </>
  );
}

function PoolingProperties({
  labels,
  node,
  updateNode,
}: {
  labels: PropertyLabels;
  node: PoolingNodeData;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <>
      <div className="property-field">
        <span className="property-label">{labels.poolMode}</span>
        <PropertyDropdown<PoolMode>
          options={[
            { label: labels.maxPool, value: 'max' },
            { label: labels.averagePool, value: 'average' },
          ]}
          value={node.poolMode}
          onChange={(poolMode) => updateNode(node, { poolMode })}
        />
      </div>
      <PositiveIntegerField label={labels.kernelSize} value={node.kernelSize} onChange={(kernelSize) => updateNode(node, { kernelSize })} />
      <PositiveIntegerField label={labels.stride} value={node.stride} onChange={(stride) => updateNode(node, { stride })} />
      <NonNegativeIntegerField label={labels.padding} value={node.padding} onChange={(padding) => updateNode(node, { padding })} />
    </>
  );
}

function GlobalPoolingProperties({
  labels,
  node,
  updateNode,
}: {
  labels: PropertyLabels;
  node: Extract<ModuleNodeData, { kind: 'GlobalPooling' }>;
  updateNode: UpdateSelectedNode;
}) {
  return (
    <div className="property-field">
      <span className="property-label">{labels.poolMode}</span>
      <PropertyDropdown<PoolMode>
        options={[
          { label: labels.maxPool, value: 'max' },
          { label: labels.averagePool, value: 'average' },
        ]}
        value={node.poolMode}
        onChange={(poolMode) => updateNode(node, { poolMode })}
      />
    </div>
  );
}

function SpatialDimensionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Exclude<ModuleDimension, 'absent'>;
  onChange: (value: Exclude<ModuleDimension, 'absent'>) => void;
}) {
  return (
    <div className="property-field">
      <span className="property-label">{label}</span>
      <div className="dimension-field-input">
        <NumberField
          className="dimension-number-field"
          key={value === 'unknown' ? 'unknown' : 'known'}
          label={label}
          min={1}
          placeholder="?"
          value={typeof value === 'number' ? value : undefined}
          onClear={() => onChange('unknown')}
          onChange={(next) => onChange(Math.max(1, Math.round(next)))}
        />
        <button
          className="dimension-state-button"
          onClick={() => onChange(value === 'unknown' ? 1 : 'unknown')}
          title={value === 'unknown' ? `Set ${label}` : `Set ${label} unknown`}
          type="button"
        >
          {value === 'unknown' ? '1' : '?'}
        </button>
      </div>
    </div>
  );
}

function PositiveIntegerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <NumberField label={label} min={1} value={value} onChange={(next) => onChange(Math.round(next))} />;
}

function NonNegativeIntegerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return <NumberField label={label} min={0} value={value} onChange={(next) => onChange(Math.round(next))} />;
}

function LinearProperties({
  labels,
  node,
  updateNode,
}: {
  labels: PropertyLabels;
  node: LinearNodeData | CNNNodeData;
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
