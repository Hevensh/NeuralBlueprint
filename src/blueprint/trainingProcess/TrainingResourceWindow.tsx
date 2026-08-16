import { useState, type CSSProperties } from 'react';
import { useLabels } from '../../i18n/useLanguage';
import type {
  TrainingResourceProfile,
  TrainingRunEstimate,
} from '../neuralBlueprint/analysis/trainingResources';
import '../analysisWindow.css';

export function TrainingResourceWindow({
  profile,
  run,
}: {
  profile: TrainingResourceProfile;
  run: TrainingRunEstimate;
}) {
  const [open, setOpen] = useState(false);
  const labels = useLabels().trainingProcess.resources;
  const usedRatio = run.availableVramMiB > 0
    ? Math.min(1, run.estimatedPeakMiB / run.availableVramMiB)
    : 0;

  return (
    <>
      <button
        className="toggle-button training-resource-trigger"
        onClick={() => setOpen(true)}
        type="button"
      >
        {labels.title}
      </button>
      {open && (
        <div
          className="analysis-window-backdrop"
          onMouseDown={() => setOpen(false)}
          role="presentation"
        >
          <section
            aria-modal="true"
            className="analysis-window training-resource-window"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="analysis-window-header">
              <span>{labels.title}</span>
              <button
                aria-label={labels.close}
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>

            <div className="training-resource-summary">
              <div>
                <span>{labels.peakVram}</span>
                <strong>{formatMiB(run.estimatedPeakMiB)}</strong>
              </div>
              <div>
                <span>{labels.serverVram}</span>
                <strong>{formatMiB(run.availableVramMiB)}</strong>
              </div>
              <div>
                <span>{labels.parameters}</span>
                <strong>{formatCompact(profile.parameterCount)}</strong>
              </div>
              <div>
                <span>{labels.batchSize}</span>
                <strong>{profile.batchSize}</strong>
              </div>
            </div>

            <div className="training-vram-chart">
              <div className="training-vram-track">
                <div
                  className={`training-vram-used ${run.fitsInVram ? '' : 'overflow'}`}
                  style={{ '--resource-ratio': `${usedRatio * 100}%` } as CSSProperties}
                />
              </div>
              <div className="training-vram-caption">
                <span>{labels.estimated}</span>
                <strong>{run.fitsInVram ? labels.available : labels.insufficient}</strong>
              </div>
            </div>

            <div className="training-resource-breakdown">
              <ResourceRow
                label={labels.parametersAndGradients}
                value={formatMiB(profile.parameterAndGradientMiB)}
              />
              <ResourceRow
                label={labels.savedActivations}
                value={formatMiB(profile.savedActivationMiB)}
              />
              <ResourceRow
                label={labels.optimizerState}
                value={formatMiB(run.optimizerStateMiB)}
              />
              <ResourceRow
                label={labels.forwardWork}
                value={`${formatNumber(profile.forwardFlopsPerSample / 1e9)} GFLOP / sample`}
              />
              <ResourceRow
                label={labels.epochWork}
                value={`${formatNumber(run.workTflopPerEpoch)} TFLOP`}
              />
              <ResourceRow
                label={labels.epochDuration}
                value={`${run.gameMinutesPerEpoch} ${labels.gameMinutes}`}
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ResourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMiB(value: number) {
  if (value >= 1024) return `${formatNumber(value / 1024)} GiB`;
  return `${formatNumber(value)} MiB`;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? 'compact' : 'standard',
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}
