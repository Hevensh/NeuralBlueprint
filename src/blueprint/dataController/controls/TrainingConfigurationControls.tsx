import { NumberField } from '../../../NumberField';
import {
  ControlGrid,
  ControlSection,
} from './ControlSection';

export interface TrainingConfigurationControlsProps {
  disabled?: boolean;
  trainDisabled?: boolean;
  showAllocationButtons?: boolean;
  learningRate: number;
  regularizationRate: number;
  trainSteps: number;
  onLearningRateChange: (value: number) => void;
  onRegularizationRateChange: (value: number) => void;
  onTrainStepsChange: (value: number) => void;
  onTrain: () => void;
  onTransfer: () => void;
  onPerfect: () => void;
  onReset: () => void;
}

export function TrainingConfigurationControls(
  props: TrainingConfigurationControlsProps,
) {
  return (
    <ControlSection
      title="Training Configuration"
      onReset={props.onReset}
      resetDisabled={props.disabled}
    >
      <ControlGrid>
        <NumberField
          label="Learning Rate (10^)"
          value={props.learningRate}
          onChange={(value) => props.onLearningRateChange(Math.round(value))}
        />
        <NumberField
          label="Regularization (10^)"
          value={props.regularizationRate}
          onChange={(value) => props.onRegularizationRateChange(Math.round(value))}
        />
      </ControlGrid>
      <NumberField
        label="Train Steps"
        min={1}
        value={props.trainSteps}
        onChange={(value) => props.onTrainStepsChange(Math.max(1, Math.floor(value)))}
      />
      <button
        className="action-button"
        disabled={props.disabled || props.trainDisabled}
        onClick={props.onTrain}
        title={props.trainDisabled ? 'Initialize model before training' : undefined}
        type="button"
      >
        Train
      </button>
      {props.showAllocationButtons !== false && (
        <>
          <button
            className="action-button"
            disabled={props.disabled}
            onClick={props.onTransfer}
            type="button"
          >
            Transfer Allocation
          </button>
          <button
            className="action-button"
            disabled={props.disabled}
            onClick={props.onPerfect}
            type="button"
          >
            Perfect Allocation
          </button>
        </>
      )}
    </ControlSection>
  );
}
