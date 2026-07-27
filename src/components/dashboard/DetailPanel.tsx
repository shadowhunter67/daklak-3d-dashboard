import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import type { WardCollection, Metric } from '../../types/map';
import { normalizeDisplayName, splitDisplayNameWords } from '../../utils/displayName';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { formatNumber } from '../../i18n/formatters';
const data = wards as WardCollection;
const metricMap = metrics as Partial<Record<string, Metric>>;
export function DetailPanel() {
  const { t, locale } = useTranslation();
  const selected = useMapStore((s) => s.selectedCode),
    hovered = useMapStore((s) => s.hoveredCode);
  const code = selected ?? hovered;
  const f = data.features.find((x) => x.properties.code === code);
  if (!f)
    return (
      <aside className="detail-panel glass empty">
        <span>◌</span>
        <h2>{t('detailPanel.emptyHeading')}</h2>
        <p>{t('detailPanel.emptyBody')}</p>
      </aside>
    );
  const m = metricMap[f.properties.code];
  if (!m)
    return (
      <aside className="detail-panel glass empty" role="alert">
        <h2>{t('detailPanel.noDataHeading')}</h2>
        <p>{t('detailPanel.noDataBody')}</p>
      </aside>
    );
  const displayName = normalizeDisplayName(f.properties.name);
  return (
    <aside className="detail-panel glass">
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
          <dt>{t('detailPanel.illustrativePopulation')}</dt>
          <dd>{formatNumber(m.population, locale)}</dd>
        </div>
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
