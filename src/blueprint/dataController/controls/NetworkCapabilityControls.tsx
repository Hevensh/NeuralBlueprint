import { useEffect } from 'react';
import { NumberField } from '../../../NumberField';
import type { NetworkCapabilityMode } from '../../../taskData/blueprintFeatureConfig';
import {
  ControlGrid,
  ControlSection,
  TextField,
} from './ControlSection';
import type { MemoryProfileSource } from '../../knowledgeGraph/model/types';

export interface NetworkCapabilityControlsProps {
  mode?: NetworkCapabilityMode;
  memory: number;
  reasoning: number;
  memoryProfileSource: MemoryProfileSource;
  hasBlueprintProfile: boolean;
  initializationSeed: string;
  onMemoryChange: (value: number) => void;
  onReasoningChange: (value: number) => void;
  onMemoryProfileSourceChange: (source: MemoryProfileSource) => void;
  onInitializationSeedChange: (value: string) => void;
  onInitialize: () => void;
  onReset: () => void;
}

export function NetworkCapabilityControls(props: NetworkCapabilityControlsProps) {
  const {
    mode: configuredMode = 'select',
    memory,
    reasoning,
    memoryProfileSource,
    hasBlueprintProfile,
    initializationSeed,
    onMemoryChange,
    onReasoningChange,
    onMemoryProfileSourceChange,
    onInitializationSeedChange,
    onInitialize,
    onReset,
  } = props;
  const source = configuredMode === 'select'
    ? memoryProfileSource
    : configuredMode;

  useEffect(() => {
    if (
      configuredMode !== 'select'
      && memoryProfileSource !== configuredMode
    ) {
      onMemoryProfileSourceChange(configuredMode);
    }
  }, [configuredMode, memoryProfileSource, onMemoryProfileSourceChange]);

  return (
    <ControlSection title="Network Capability" onReset={onReset}>
      {configuredMode === 'select' && (
        <div className="top-bar-tabs property-direction-tabs">
          <button
            className={`top-bar-tab ${
              source === 'preset' ? 'active' : ''
            }`}
            onClick={() => onMemoryProfileSourceChange('preset')}
            type="button"
          >
            Preset
          </button>
          <button
            className={`top-bar-tab ${
              source === 'blueprint' ? 'active' : ''
            }`}
            disabled={!hasBlueprintProfile}
            onClick={() => onMemoryProfileSourceChange('blueprint')}
            type="button"
          >
            Blueprint
          </button>
        </div>
      )}
      <ControlGrid>
        <NumberField
          disabled={source === 'blueprint'}
          label="Memory"
          min={0}
          value={memory}
          onChange={(value) => onMemoryChange(Math.max(0, Math.floor(value)))}
        />
        <NumberField
          disabled={source === 'blueprint'}
          label="Reasoning"
          min={0}
          value={reasoning}
          onChange={(value) => onReasoningChange(Math.max(0, Math.floor(value)))}
        />
      </ControlGrid>
      <TextField
        label="Initialization Seed"
        value={initializationSeed}
        onChange={onInitializationSeedChange}
      />
      <button className="action-button" onClick={onInitialize} type="button">
        Initialize Model
      </button>
    </ControlSection>
  );
}
