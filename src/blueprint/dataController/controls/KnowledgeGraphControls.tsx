import { NumberField } from '../../../NumberField';
import { useLabels } from '../../../i18n/useLanguage';
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
  const labels = useLabels().knowledgeGraph.controls.graph;
  const setMinNodes = (value: number) => {
    const minNodes = Math.max(2, Math.floor(value));
    props.onMinNodesChange(minNodes);
    if (props.maxNodes < minNodes) props.onMaxNodesChange(minNodes);
  };
  const setMaxNodes = (value: number) => {
    props.onMaxNodesChange(Math.max(props.minNodes, Math.floor(value)));
  };

  return (
    <ControlSection
      title={labels.title}
      onReset={props.onReset}
      resetLabel={labels.reset}
    >
      <ControlGrid>
        <NumberField label={labels.minNodes} min={2} value={props.minNodes} onChange={setMinNodes} />
        <NumberField label={labels.maxNodes} min={props.minNodes} value={props.maxNodes} onChange={setMaxNodes} />
      </ControlGrid>
      <ControlGrid>
        <NumberField
          label={labels.datasetCount}
          min={1}
          value={props.datasetCount}
          onChange={(value) => props.onDatasetCountChange(Math.max(1, Math.floor(value)))}
        />
        <TextField label={labels.generationSeed} value={props.seed} onChange={props.onSeedChange} />
      </ControlGrid>
      <button className="action-button" onClick={props.onGenerate} type="button">
        {labels.generate}
      </button>
    </ControlSection>
  );
}
