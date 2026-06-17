import { type ChangeEvent } from 'react';
import { PropertyDropdown } from '../../PropertyDropdown';
import type {
  BiasInitializationMode,
  InputNormalizationMode,
  LinearInitializationMode,
  ModuleBaseNodeData,
} from './ModuleBaseNodeTypes';

interface NeuralBlueprintModulePropertiesProps {
  selectedNode: ModuleBaseNodeData;
  showRankAnalysis: boolean;
  updateSelectedNode: (patch: Partial<ModuleBaseNodeData>) => void;
}

export function NeuralBlueprintModuleProperties({
  selectedNode,
  showRankAnalysis,
  updateSelectedNode,
}: NeuralBlueprintModulePropertiesProps) {
  if (selectedNode.kind === 'Input') {
    return (
      <>
        {showRankAnalysis && (
          <label className="property-field">
            <span className="property-label">Effective Rank</span>
            <input
              className="property-input"
              value={formatIntegerPropertyNumber(selectedNode.stats?.effectiveRank)}
              onChange={(event) => updateSelectedNode({
                stats: {
                  ...selectedNode.stats,
                  rank: selectedNode.stats?.rank ?? 64,
                  effectiveRank: parseIntegerPropertyNumber(event.target.value),
                  saturation: selectedNode.stats?.saturation ?? 0,
                  mean: selectedNode.stats?.mean ?? Number.NaN,
                  variance: selectedNode.stats?.variance ?? Number.NaN,
                  zeroRate: selectedNode.stats?.zeroRate ?? Number.NaN,
                  negativeRate: selectedNode.stats?.negativeRate,
                },
              })}
            />
          </label>
        )}

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
      </>
    );
  }

  if (selectedNode.kind === 'Linear') {
    return (
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
    );
  }

  if (selectedNode.kind === 'Dropout') {
    return (
      <label className="property-field">
        <span className="property-label">Dropout Rate (%)</span>
        <input
          className="property-input"
          value={formatPercentRate(selectedNode.dropoutRate)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => updateSelectedNode({
            dropoutRate: parsePercentRate(event.target.value),
          })}
        />
      </label>
    );
  }

  return null;
}

function parseIntegerPropertyNumber(value: string) {
  return value.trim() === '' ? Number.NaN : Math.round(Number(value));
}

function parsePercentRate(value: string) {
  if (value.trim() === '') {
    return 0;
  }

  return Math.min(Math.max(Number(value), 0), 100) / 100;
}

function formatIntegerPropertyNumber(value: number | undefined) {
  return typeof value === 'number' && !Number.isNaN(value) ? String(Math.round(value)) : '';
}

function formatPercentRate(value: number | undefined) {
  return typeof value === 'number' && !Number.isNaN(value) ? String(Math.round(value * 100)) : '';
}
