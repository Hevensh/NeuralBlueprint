import { NumberField } from '../../../NumberField';
import {
  ControlGrid,
  ControlSection,
  TextField,
} from './ControlSection';
import type { MemoryProfileSource } from '../../knowledgeGraph/model/types';

export interface NetworkCapabilityControlsProps {
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
  return (
    <ControlSection title="Network Capability" onReset={props.onReset}>
      <div className="top-bar-tabs property-direction-tabs">
        <button
          className={`top-bar-tab ${
            props.memoryProfileSource === 'preset' ? 'active' : ''
          }`}
          onClick={() => props.onMemoryProfileSourceChange('preset')}
          type="button"
        >
          Preset
        </button>
        <button
          className={`top-bar-tab ${
            props.memoryProfileSource === 'blueprint' ? 'active' : ''
          }`}
          disabled={!props.hasBlueprintProfile}
          onClick={() => props.onMemoryProfileSourceChange('blueprint')}
          type="button"
        >
          Blueprint
        </button>
      </div>
      <ControlGrid>
        <NumberField
          disabled={props.memoryProfileSource === 'blueprint'}
          label="Memory"
          min={0}
          value={props.memory}
          onChange={(value) => props.onMemoryChange(Math.max(0, Math.floor(value)))}
        />
        <NumberField
          disabled={props.memoryProfileSource === 'blueprint'}
          label="Reasoning"
          min={0}
          value={props.reasoning}
          onChange={(value) => props.onReasoningChange(Math.max(0, Math.floor(value)))}
        />
      </ControlGrid>
      <TextField
        label="Initialization Seed"
        value={props.initializationSeed}
        onChange={props.onInitializationSeedChange}
      />
      <button className="action-button" onClick={props.onInitialize} type="button">
        Initialize Model
      </button>
    </ControlSection>
  );
}
