import {
  formatRadiusDistance,
  queryRadius,
  RADIUS_PRESETS_METERS,
  type RadiusMatch,
  type RadiusQueryPoint,
} from './radiusQuery';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';

const KIND_LABEL_KEY: Record<RadiusMatch['kind'], MessageKey> = {
  'key-project': 'radiusQuery.kind.keyProject',
  'planning-zone': 'radiusQuery.kind.planningZone',
  ward: 'radiusQuery.kind.ward',
};

export function RadiusQueryTool({
  active,
  center,
  radiusMeters,
  onToggle,
  onRadiusChange,
  onClear,
}: {
  active: boolean;
  center: RadiusQueryPoint | null;
  radiusMeters: number;
  onToggle: () => void;
  onRadiusChange: (radiusMeters: number) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const matches = center ? queryRadius(center, radiusMeters) : [];
  return (
    <div className="radius-query-tool">
      <button type="button" aria-pressed={active} onClick={onToggle}>
        {active ? t('radiusQuery.exit') : t('radiusQuery.start')}
      </button>
      {active && (
        <div className="radius-query-tool__panel">
          <p id="radius-query-instructions">
            {center ? t('radiusQuery.instructionsChangePoint') : t('radiusQuery.instructions')}
          </p>
          <div
            className="radius-query-tool__presets"
            role="group"
            aria-label={t('radiusQuery.radiusLabel')}
          >
            {RADIUS_PRESETS_METERS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={radiusMeters === preset}
                onClick={() => onRadiusChange(preset)}
              >
                {formatRadiusDistance(preset)}
              </button>
            ))}
          </div>
          {center ? (
            <>
              <p role="status" aria-live="polite">
                {matches.length === 0
                  ? t('radiusQuery.noMatches', { radius: formatRadiusDistance(radiusMeters) })
                  : t('radiusQuery.matchCount', { count: String(matches.length) })}
              </p>
              {matches.length > 0 && (
                <ul className="radius-query-tool__matches">
                  {matches.map((match) => (
                    <li key={`${match.kind}-${match.id}`}>
                      <span className="radius-query-tool__match-name">{match.name}</span>
                      <span className="radius-query-tool__match-meta">
                        {t(KIND_LABEL_KEY[match.kind])} ·{' '}
                        {formatRadiusDistance(match.distanceMeters)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="radius-query-tool__actions">
                <button type="button" onClick={onClear}>
                  {t('radiusQuery.clear')}
                </button>
              </div>
            </>
          ) : (
            <p role="status" aria-live="polite">
              {t('radiusQuery.noCenter')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
