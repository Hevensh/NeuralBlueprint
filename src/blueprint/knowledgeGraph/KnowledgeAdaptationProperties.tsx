import { useLabels } from '../../i18n/LanguageContext';
import {
  DISTANCE_INDEX_BANDS,
  RECEPTIVE_FIELD_BANDS,
} from './model/adaptation';
import type {
  DistanceIndexBand,
  KnowledgeAdaptationRequirements,
  KnowledgeAdaptationRoute,
  ReceptiveFieldBand,
} from './model/types';

type AdaptationBand = ReceptiveFieldBand | DistanceIndexBand;

export type AdaptationChange = (
  entityId: string,
  route: KnowledgeAdaptationRoute,
  band: AdaptationBand,
  value: number,
) => void;

export function KnowledgeAdaptationProperties({
  entityId,
  requirements,
  showDistanceIndex,
  showReceptiveField,
  onRequirementChange,
}: {
  entityId: string;
  requirements: KnowledgeAdaptationRequirements;
  showDistanceIndex: boolean;
  showReceptiveField: boolean;
  onRequirementChange: AdaptationChange;
}) {
  return (
    <>
      {showReceptiveField && (
        <AdaptationRequirementRow
          entityId={entityId}
          requirements={requirements}
          route="receptiveField"
          onRequirementChange={onRequirementChange}
        />
      )}
      {showDistanceIndex && (
        <AdaptationRequirementRow
          entityId={entityId}
          requirements={requirements}
          route="distanceIndex"
          onRequirementChange={onRequirementChange}
        />
      )}
    </>
  );
}

function AdaptationRequirementRow({
  entityId,
  requirements,
  route,
  onRequirementChange,
}: {
  entityId: string;
  requirements: KnowledgeAdaptationRequirements;
  route: KnowledgeAdaptationRoute;
  onRequirementChange: AdaptationChange;
}) {
  const labels = useLabels().knowledgeGraph.detail;
  const bands = route === 'receptiveField'
    ? RECEPTIVE_FIELD_BANDS
    : DISTANCE_INDEX_BANDS;
  const bandLabels = route === 'receptiveField'
    ? ['S', 'M', 'L', 'XL', 'G']
    : ['N', 'S', 'M', 'L', 'G'];
  const values = bands.map((band) => readRequirement(requirements, route, band));
  const maxLogValue = Math.max(0, ...values.map((value) => Math.log1p(value)));

  return (
    <section className="knowledge-adaptation-table">
      <div className="knowledge-adaptation-title">
        {route === 'receptiveField'
          ? labels.receptiveFieldRequirements
          : labels.distanceIndexRequirements}
      </div>
      <div className="knowledge-adaptation-five-column-row">
        {bands.map((band, index) => {
          const value = values[index];
          const level = maxLogValue > 0 ? Math.log1p(value) / maxLogValue : 0;
          return (
            <label className="knowledge-adaptation-cell" key={band}>
              <span className="knowledge-adaptation-band">
                {bandLabels[index]}
              </span>
              <input
                aria-label={`${labels.required} ${bandLabels[index]}`}
                className="property-input"
                min={0}
                step={1}
                type="number"
                value={value}
                onChange={(event) => onRequirementChange(
                  entityId,
                  route,
                  band,
                  normalizeInteger(event.target.value),
                )}
              />
              <span className="knowledge-adaptation-mini-bar" aria-hidden="true">
                <span style={{ width: `${level * 100}%` }} />
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function readRequirement(
  requirements: KnowledgeAdaptationRequirements,
  route: KnowledgeAdaptationRoute,
  band: AdaptationBand,
) {
  return (requirements[route] as Record<string, number>)[band] ?? 0;
}

function normalizeInteger(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}
