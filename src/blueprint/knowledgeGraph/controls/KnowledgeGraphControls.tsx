import { NumberField } from '../../../NumberField';
import {
  ControlGrid,
  ControlSection,
  TextField,
} from './ControlSection';

export interface KnowledgeGraphControlsProps {
  minNodes: number;
  maxNodes: number;
  datasetCount: number;
  seed: string;
  onMinNodesChange: (value: number) => void;
  onMaxNodesChange: (value: number) => void;
  onDatasetCountChange: (value: number) => void;
  onSeedChange: (value: string) => void;
  onGenerate: () => void;
  onReset: () => void;
}

export function KnowledgeGraphControls(props: KnowledgeGraphControlsProps) {
  const setMinNodes = (value: number) => {
    const minNodes = Math.max(2, Math.floor(value));
    props.onMinNodesChange(minNodes);
    if (props.maxNodes < minNodes) props.onMaxNodesChange(minNodes);
  };
  const setMaxNodes = (value: number) => {
    props.onMaxNodesChange(Math.max(props.minNodes, Math.floor(value)));
  };

  return (
    <ControlSection title="Knowledge Graph" onReset={props.onReset}>
      <ControlGrid>
        <NumberField label="Min Nodes" min={2} value={props.minNodes} onChange={setMinNodes} />
        <NumberField label="Max Nodes" min={props.minNodes} value={props.maxNodes} onChange={setMaxNodes} />
      </ControlGrid>
      <ControlGrid>
        <NumberField
          label="Dataset Count"
          min={1}
          value={props.datasetCount}
          onChange={(value) => props.onDatasetCountChange(Math.max(1, Math.floor(value)))}
        />
        <TextField label="Generation Seed" value={props.seed} onChange={props.onSeedChange} />
      </ControlGrid>
      <button className="action-button" onClick={props.onGenerate} type="button">
        Generate
      </button>
    </ControlSection>
  );
}
