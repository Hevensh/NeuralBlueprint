import type {
  KnowledgeAdaptationRequirements,
} from './model/types';
import {
  SPATIAL_AXES,
  SPATIAL_BANDS,
  type SpatialAdaptationRoute,
} from './model/adaptation';

export function AdaptationRequirementPreview({
  className,
  requirements,
  route,
}: {
  className?: string;
  requirements: KnowledgeAdaptationRequirements;
  route: SpatialAdaptationRoute;
}) {
  const activeAxes = SPATIAL_AXES.filter((axis) => requirements[axis]);
  if (activeAxes.length === 0) return null;
  return (
    <span className={className}>
      {activeAxes.map((axis) => (
        <span className="knowledge-adaptation-preview-row" key={axis}>
          {route === 'scale' ? 'S' : 'I'}-{axisLabel(axis)}{' '}
          {SPATIAL_BANDS.map((band) => format(
            requirements[axis]?.[route][band] ?? 0,
          )).join(' ')}
        </span>
      ))}
    </span>
  );
}

function axisLabel(axis: typeof SPATIAL_AXES[number]) {
  return axis === 'time' ? 'T' : axis === 'height' ? 'H' : 'W';
}

function format(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
