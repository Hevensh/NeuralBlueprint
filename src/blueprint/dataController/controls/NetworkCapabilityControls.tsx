import { useEffect } from 'react';
import { NumberField } from '../../../NumberField';
import { useLabels } from '../../../i18n/useLanguage';
import type { NetworkCapabilityMode } from '../../../taskData/blueprintFeatureConfig';
import {
  ControlGrid,
  ControlSection,
  TextField,
} from './ControlSection';
import type { MemoryProfileSource } from '../../knowledgeGraph/model/types';

export interface NetworkCapabilityControlsProps {
  mode?: NetworkCapabilityMode;
  showMemoryReasoningControls?: boolean;
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
    showMemoryReasoningControls = true,
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
  const labels = useLabels().knowledgeGraph.controls.networkCapability;
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
    <ControlSection
      title={labels.title}
      onReset={onReset}
      resetLabel={labels.reset}
    >
      {configuredMode === 'select' && (
        <div className="top-bar-tabs property-direction-tabs">
          <button
            className={`top-bar-tab ${
              source === 'preset' ? 'active' : ''
            }`}
            onClick={() => onMemoryProfileSourceChange('preset')}
            type="button"
          >
            {labels.preset}
          </button>
          <button
            className={`top-bar-tab ${
              source === 'blueprint' ? 'active' : ''
            }`}
            disabled={!hasBlueprintProfile}
            onClick={() => onMemoryProfileSourceChange('blueprint')}
            type="button"
          >
            {labels.blueprint}
          </button>
        </div>
      )}
      {showMemoryReasoningControls && (
        <ControlGrid>
          <NumberField
            disabled={source === 'blueprint'}
            label={labels.memory}
            min={0}
            value={memory}
            onChange={(value) => onMemoryChange(Math.max(0, Math.floor(value)))}
          />
          <NumberField
            disabled={source === 'blueprint'}
            label={labels.reasoning}
            min={0}
            value={reasoning}
            onChange={(value) => onReasoningChange(Math.max(0, Math.floor(value)))}
          />
        </ControlGrid>
      )}
      <TextField
        label={labels.initializationSeed}
        value={initializationSeed}
        onChange={onInitializationSeedChange}
      />
      <button
        className="action-button"
        data-guide-target="training-initialize-model"
        onClick={onInitialize}
        type="button"
      >
        {labels.initialize}
      </button>
    </ControlSection>
  );
}
