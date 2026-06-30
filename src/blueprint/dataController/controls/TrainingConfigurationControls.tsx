import { NumberField } from '../../../NumberField';
import { useLabels } from '../../../i18n/LanguageContext';
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
  const labels = useLabels().knowledgeGraph.controls.trainingConfiguration;

  return (
    <ControlSection
      title={labels.title}
      onReset={props.onReset}
      resetDisabled={props.disabled}
      resetLabel={labels.reset}
    >
      <ControlGrid>
        <NumberField
          label={`${labels.learningRate} (10^)`}
          value={props.learningRate}
          onChange={(value) => props.onLearningRateChange(Math.round(value))}
        />
        <NumberField
          label={`${labels.regularizationRate} (10^)`}
          value={props.regularizationRate}
          onChange={(value) => props.onRegularizationRateChange(Math.round(value))}
        />
      </ControlGrid>
      <NumberField
        guideTarget="training-train-steps"
        label={labels.trainSteps}
        min={1}
        value={props.trainSteps}
        onChange={(value) => props.onTrainStepsChange(Math.max(1, Math.floor(value)))}
      />
      <button
        className="action-button"
        data-guide-target="training-train-button"
        disabled={props.disabled || props.trainDisabled}
        onClick={props.onTrain}
        title={props.trainDisabled ? labels.initializeBeforeTraining : undefined}
        type="button"
      >
        {labels.train}
      </button>
      {props.showAllocationButtons !== false && (
        <>
          <button
            className="action-button"
            disabled={props.disabled}
            onClick={props.onTransfer}
            type="button"
          >
            {labels.transferAllocation}
          </button>
          <button
            className="action-button"
            disabled={props.disabled}
            onClick={props.onPerfect}
            type="button"
          >
            {labels.perfectAllocation}
          </button>
        </>
      )}
    </ControlSection>
  );
}
