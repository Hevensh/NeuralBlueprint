import { useState, type MouseEvent } from 'react';
import { useLabels } from '../../i18n/useLanguage';
import type {
  InferenceMemoryAggregationPair,
  InferenceMemoryProfile,
} from '../InferenceMemoryProfileTypes';
import type { SpatialAxis } from '../SpatialAdaptationTypes';
import { InferenceMemoryChart } from './InferenceMemoryChart';
import { formatInferenceMemoryPoint } from './inferenceMemoryFormat';
import './InferenceMemorySelector.css';

interface InferenceMemorySelectorProps {
  modelOptions: Array<{
    id: string;
    label: string;
  }>;
  onActiveGroupFocusChange: (
    focus: {
      nodeIds: string[];
      aggregationPairs: InferenceMemoryAggregationPair[];
    } | null,
  ) => void;
  onModelChange: (modelId: string) => void;
  profile: InferenceMemoryProfile;
  selectedModelId: string;
  showIndex: boolean;
  showMemory: boolean;
  showScale: boolean;
  showVariance: boolean;
  spatialAxes: SpatialAxis[];
}

export function InferenceMemorySelector({
  modelOptions,
  onActiveGroupFocusChange,
  onModelChange,
  profile,
  selectedModelId,
  showIndex,
  showMemory,
  showScale,
  showVariance,
  spatialAxes,
}: InferenceMemorySelectorProps) {
  const labels = useLabels().neuralBlueprint.inferenceMemory;
  const [open, setOpen] = useState(false);
  const stopCanvasInteraction = (event: MouseEvent) => event.stopPropagation();

  return (
    <section
      aria-label={labels.title}
      className={`inference-memory-selector ${open ? 'open' : ''} nodrag nopan`}
      onClick={stopCanvasInteraction}
      onMouseDown={stopCanvasInteraction}
    >
      <button
        aria-expanded={open}
        className="inference-memory-selector-toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <strong>{labels.title}</strong>
        <span>{formatActiveAnalyses({
          labels,
          profile,
          showIndex,
          showMemory,
          showScale,
          showVariance,
        })}</span>
        <span>{open ? labels.hide : labels.show}</span>
      </button>

      {open && (
        <div className="inference-memory-selector-content">
          <InferenceMemoryChart
            modelOptions={modelOptions}
            onActiveGroupFocusChange={onActiveGroupFocusChange}
            onModelChange={onModelChange}
            profile={profile}
            selectedModelId={selectedModelId}
            showIndex={showIndex}
            showMemory={showMemory}
            showScale={showScale}
            showVariance={showVariance}
            spatialAxes={spatialAxes}
          />
        </div>
      )}
    </section>
  );
}

function formatActiveAnalyses({
  labels,
  profile,
  showIndex,
  showMemory,
  showScale,
  showVariance,
}: {
  labels: ReturnType<typeof useLabels>['neuralBlueprint']['inferenceMemory'];
  profile: InferenceMemoryProfile;
  showIndex: boolean;
  showMemory: boolean;
  showScale: boolean;
  showVariance: boolean;
}) {
  return [
    showMemory
      ? `${labels.memory} ${formatInferenceMemoryPoint(profile.totalMemoryPoint)}`
      : null,
    showScale ? labels.scale : null,
    showIndex ? labels.index : null,
    showVariance ? labels.variance : null,
  ].filter(Boolean).join(' · ');
}
