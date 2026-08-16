import { NumberField } from '../../../NumberField';
import type { CSSProperties } from 'react';
import { useLabels } from '../../../i18n/useLanguage';
import { PropertyDropdown } from '../../../PropertyDropdown';
import type { OptimizerKind } from '../../knowledgeGraph/model/types';
import {
  ControlGrid,
  ControlSection,
} from './ControlSection';

export interface TrainingConfigurationControlsProps {
  disabled?: boolean;
  trainDisabled?: boolean;
  showAllocationButtons?: boolean;
  optimizer: OptimizerKind;
  learningRate: number;
  regularizationRate: number;
  trainEpochs: number;
  training: boolean;
  trainingMinutes: number;
  trainingMinutesPerEpoch: number;
  trainingProgress: number;
  trainingResourceError?: 'invalid-model' | 'insufficient-vram';
  onLearningRateChange: (value: number) => void;
  onOptimizerChange: (value: OptimizerKind) => void;
  onRegularizationRateChange: (value: number) => void;
  onTrainEpochsChange: (value: number) => void;
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
      <div className="property-field" title={labels.optimizerHint}>
        <span className="property-label">{labels.optimizer}</span>
        <PropertyDropdown<OptimizerKind>
          disabled={props.disabled}
          options={[
            { label: 'SGD', value: 'sgd' },
            { label: 'Adam', value: 'adam' },
          ]}
          value={props.optimizer}
          onChange={props.onOptimizerChange}
        />
      </div>
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
        guideTarget="training-train-epochs"
        label={labels.trainEpochs}
        min={1}
        value={props.trainEpochs}
        onChange={(value) => props.onTrainEpochsChange(Math.max(1, Math.floor(value)))}
      />
      <button
        className={`action-button training-action-button ${props.training ? 'training' : ''}`}
        data-guide-target="training-train-button"
        disabled={props.disabled || props.trainDisabled}
        onClick={props.onTrain}
        style={{
          '--training-progress': `${Math.max(0, Math.min(1, props.trainingProgress)) * 100}%`,
        } as CSSProperties}
        title={getTrainDisabledTitle(props, labels)}
        type="button"
      >
        {props.training
          ? `${labels.training} ${Math.round(props.trainingProgress * 100)}%`
          : labels.train}
      </button>
      <div className="training-duration-preview">
        <span>{labels.epochDuration}</span>
        <strong>{props.trainingMinutesPerEpoch} {labels.gameMinutes}</strong>
        <span>{labels.totalDuration}</span>
        <strong>{props.trainingMinutes} {labels.gameMinutes}</strong>
      </div>
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

function getTrainDisabledTitle(
  props: TrainingConfigurationControlsProps,
  labels: ReturnType<typeof useLabels>['knowledgeGraph']['controls']['trainingConfiguration'],
) {
  if (props.trainingResourceError === 'invalid-model') {
    return labels.invalidModelResources;
  }
  if (props.trainingResourceError === 'insufficient-vram') {
    return labels.insufficientVram;
  }
  return props.trainDisabled ? labels.initializeBeforeTraining : undefined;
}
