import wards from '#province-assets/daklak-wards-render.json';
import { unitMetrics } from '../../data/unitMetrics';
import { formatSubUnits } from '../../data/formatSubUnits';
import { getUnitProfile } from '../../data/unitProfiles';
import type { WardCollection, Metric } from '../../types/map';
import { normalizeDisplayName, splitDisplayNameWords } from '../../utils/displayName';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { formatNumber } from '../../i18n/formatters';
const data = wards as WardCollection;
const metricMap = unitMetrics as Partial<Record<string, Metric>>;
export function DetailPanel() {
  const { t, locale } = useTranslation();
  const selected = useMapStore((s) => s.selectedCode),
    hovered = useMapStore((s) => s.hoveredCode);
  const code = selected ?? hovered;
  const f = data.features.find((x) => x.properties.code === code);
  if (!f)
    return (
      <aside className="detail-panel glass empty" tabIndex={0}>
        <span>◌</span>
        <h2>{t('detailPanel.emptyHeading')}</h2>
        <p>{t('detailPanel.emptyBody')}</p>
      </aside>
    );
  const m = metricMap[f.properties.code];
  if (!m)
    return (
      <aside className="detail-panel glass empty" role="alert" tabIndex={0}>
        <h2>{t('detailPanel.noDataHeading')}</h2>
        <p>{t('detailPanel.noDataBody')}</p>
      </aside>
    );
  const displayName = normalizeDisplayName(f.properties.name);
  const profile = getUnitProfile(f.properties.code);
  const subUnits = profile ? formatSubUnits(profile, t) : '';
  return (
    <aside className="detail-panel glass" tabIndex={0}>
      <p className="eyebrow">
        {selected ? t('detailPanel.eyebrowSelected') : t('detailPanel.eyebrowHovered')}
      </p>
      <h2 className="unit-name" data-source-name={f.properties.name} aria-label={displayName}>
        {splitDisplayNameWords(displayName).map((word, index) => (
          <span key={`${word}-${index}`}>
            {index > 0 ? ' ' : null}
            <span className="unit-name__word">{word}</span>
          </span>
        ))}
      </h2>
      <p className="unit-type">
        {t(f.properties.type === 'phuong' ? 'unitType.ward' : 'unitType.commune')} ·{' '}
        {t('detailPanel.codePrefix', { code: f.properties.code })}
      </p>
      <dl>
        <div>
          <dt>{t('detailPanel.sourceArea')}</dt>
          <dd>{formatNumber(f.properties.areaKm2, locale)} km²</dd>
        </div>
        <div>
          <dt>{t('detailPanel.population2025')}</dt>
          <dd>{formatNumber(m.population, locale)}</dd>
        </div>
        {subUnits && (
          <div>
            <dt>{t('detailPanel.subUnits')}</dt>
            <dd>{subUnits}</dd>
          </div>
        )}
        <div>
          <dt>{t('detailPanel.serviceAccess')}</dt>
          <dd>{m.coverage}%</dd>
        </div>
        <div>
          <dt>{t('detailPanel.simulatedGrowth')}</dt>
          <dd className={m.growth >= 0 ? 'positive' : ''}>
            {m.growth >= 0 ? '+' : ''}
            {m.growth}%
          </dd>
        </div>
      </dl>
    </aside>
  );
}
