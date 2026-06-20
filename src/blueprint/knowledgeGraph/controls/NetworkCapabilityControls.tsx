import { NumberField } from '../../../NumberField';
import {
  ControlGrid,
  ControlSection,
  TextField,
} from './ControlSection';

export interface NetworkCapabilityControlsProps {
  memory: number;
  reasoning: number;
  initializationSeed: string;
  onMemoryChange: (value: number) => void;
  onReasoningChange: (value: number) => void;
  onInitializationSeedChange: (value: string) => void;
  onInitialize: () => void;
  onReset: () => void;
}

export function NetworkCapabilityControls(props: NetworkCapabilityControlsProps) {
  return (
    <ControlSection title="Network Capability" onReset={props.onReset}>
      <ControlGrid>
        <NumberField
          label="Memory"
          min={0}
          value={props.memory}
          onChange={(value) => props.onMemoryChange(Math.max(0, Math.floor(value)))}
        />
        <NumberField
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
