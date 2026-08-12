import type {
  KnowledgeAdaptationRequirements,
  KnowledgeAdaptationRoute,
} from './model/types';
import {
  DISTANCE_INDEX_BANDS,
  RECEPTIVE_FIELD_BANDS,
} from './model/adaptation';

export function AdaptationRequirementPreview({
  className,
  requirements,
  route,
}: {
  className?: string;
  requirements: KnowledgeAdaptationRequirements;
  route: KnowledgeAdaptationRoute;
}) {
  const bands = route === 'receptiveField'
    ? RECEPTIVE_FIELD_BANDS
    : DISTANCE_INDEX_BANDS;
  return (
    <span className={className}>
      {route === 'receptiveField' ? 'RF' : 'DI'}{' '}
      {bands.map((band) => format(
        (requirements[route] as Record<string, number>)[band] ?? 0,
      )).join(' ')}
    </span>
  );
}

function format(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
