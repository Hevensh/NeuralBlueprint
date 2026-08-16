import { useLabels } from '../../i18n/useLanguage';
import {
  SPATIAL_AXES,
  SPATIAL_BANDS,
  createEmptyAxisAdaptation,
  type SpatialAdaptationRoute,
  type SpatialAxis,
  type SpatialBand,
} from './model/adaptation';
import type { KnowledgeAdaptationRequirements } from './model/types';

const BAND_LABELS = ['S', 'M', 'L', 'XL', 'G'];

export type AdaptationChange = (
  entityId: string,
  axis: SpatialAxis,
  route: SpatialAdaptationRoute,
  band: SpatialBand,
  value: number,
) => void;

export type AdaptationAxisChange = (
  entityId: string,
  axis: SpatialAxis,
  enabled: boolean,
) => void;

export function KnowledgeAdaptationProperties({
  entityId,
  requirements,
  showIndex,
  showScale,
  onAxisChange,
  onRequirementChange,
}: {
  entityId: string;
  requirements: KnowledgeAdaptationRequirements;
  showIndex: boolean;
  showScale: boolean;
  onAxisChange: AdaptationAxisChange;
  onRequirementChange: AdaptationChange;
}) {
  if (!showScale && !showIndex) return null;

  return (
    <section className="knowledge-spatial-requirements">
      <div className="knowledge-spatial-axis-selector">
        {SPATIAL_AXES.map((axis) => (
          <button
            aria-pressed={Boolean(requirements[axis])}
            className={`knowledge-spatial-axis-button ${
              requirements[axis] ? 'active' : ''
            }`}
            key={axis}
            onClick={() => onAxisChange(
              entityId,
              axis,
              !requirements[axis],
            )}
            type="button"
          >
            {axisLabel(axis)}
          </button>
        ))}
      </div>

      {SPATIAL_AXES.flatMap((axis) => {
        const axisRequirements = requirements[axis];
        if (!axisRequirements) return [];
        return [(
          <AxisRequirementTable
            axis={axis}
            entityId={entityId}
            key={axis}
            requirements={axisRequirements}
            showIndex={showIndex}
            showScale={showScale}
            onRequirementChange={onRequirementChange}
          />
        )];
      })}
    </section>
  );
}

function AxisRequirementTable({
  axis,
  entityId,
  requirements,
  showIndex,
  showScale,
  onRequirementChange,
}: {
  axis: SpatialAxis;
  entityId: string;
  requirements: ReturnType<typeof createEmptyAxisAdaptation>;
  showIndex: boolean;
  showScale: boolean;
  onRequirementChange: AdaptationChange;
}) {
  const labels = useLabels().knowledgeGraph.detail;
  const routes = [
    ...(showScale ? ['scale'] as const : []),
    ...(showIndex ? ['index'] as const : []),
  ];

  return (
    <div className="knowledge-adaptation-table">
      <div className="knowledge-adaptation-title">
        {labels.axisRequirement} {axisLabel(axis)}
      </div>
      {routes.map((route) => {
        const values = SPATIAL_BANDS.map((band) => requirements[route][band]);
        const maxLogValue = Math.max(
          0,
          ...values.map((value) => Math.log1p(value)),
        );
        return (
          <div className="knowledge-adaptation-matrix-row" key={route}>
            <span className="knowledge-adaptation-route-label">
              {route === 'scale' ? labels.scale : labels.index}
            </span>
            <div className="knowledge-adaptation-five-column-row">
              {SPATIAL_BANDS.map((band, bandIndex) => {
                const value = requirements[route][band];
                const level = maxLogValue > 0
                  ? Math.log1p(value) / maxLogValue
                  : 0;
                return (
                  <label className="knowledge-adaptation-cell" key={band}>
                    <span className="knowledge-adaptation-band">
                      {BAND_LABELS[bandIndex]}
                    </span>
                    <input
                      aria-label={`${labels.required} ${axisLabel(axis)} ${route} ${BAND_LABELS[bandIndex]}`}
                      className="property-input"
                      min={0}
                      step={1}
                      type="number"
                      value={value}
                      onChange={(event) => onRequirementChange(
                        entityId,
                        axis,
                        route,
                        band,
                        normalizeInteger(event.target.value),
                      )}
                    />
                    <span
                      className="knowledge-adaptation-mini-bar"
                      aria-hidden="true"
                    >
                      <span style={{ width: `${level * 100}%` }} />
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function axisLabel(axis: SpatialAxis) {
  return axis === 'time' ? 'T' : axis === 'height' ? 'H' : 'W';
}

function normalizeInteger(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}
