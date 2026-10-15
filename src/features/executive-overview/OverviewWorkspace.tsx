import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import wards from '#province-assets/daklak-wards-render.json';
import metrics from '#province-assets/daklak-metrics.json';
import labels from '#province-assets/daklak-labels.json';
import { PinIcon } from '../../components/layout/icons';
import type { Metric, WardCollection } from '../../types/map';
import { sortAdministrativeUnits } from '../../utils/administrativeUnits';
import { normalizeSearchText } from '../../utils/search';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { formatNumber } from '../../i18n/formatters';
import type { ProjectAttentionItem } from './model/executiveOverviewTypes';

const collection = wards as WardCollection;
const metricMap = metrics as Partial<Record<string, Metric>>;
const labelMap = labels as Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;
const units = sortAdministrativeUnits(collection.features.map(({ properties }) => properties));

const MAP_WIDTH = 640;
const MAP_HEIGHT = 560;
// Projected once at module load: 102 polygons, no reason to redo it per render.
const projection = geoMercator().fitExtent(
  [
    [14, 14],
    [MAP_WIDTH - 14, MAP_HEIGHT - 14],
  ],
  collection,
);
const toPath = geoPath(projection);
const wardPaths = collection.features.map((feature) => ({
  code: feature.properties.code,
  type: feature.properties.type,
  d: toPath(feature) ?? '',
}));
const mapLabels = Object.entries(labelMap)
  .filter(([, label]) => label.priority === 1)
  .flatMap(([code, label]) => {
    const point = projection([label.longitude, label.latitude]);
    return point ? [{ code, name: label.name, x: point[0], y: point[1] }] : [];
  });

type TypeFilter = 'all' | 'xa' | 'phuong';

function WardList() {
  const { t } = useTranslation();
  const selectedCode = useMapStore((state) => state.selectedCode);
  const select = useMapStore((state) => state.select);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('all');
  const communeCount = units.filter((unit) => unit.type === 'xa').length;
  const wardCount = units.length - communeCount;
  const rows = useMemo(() => {
    const term = normalizeSearchText(query);
    return units.filter(
      (unit) =>
        (filter === 'all' || unit.type === filter) &&
        (!term || normalizeSearchText(unit.name).includes(term)),
    );
  }, [query, filter]);
  const chips: Array<[TypeFilter, string]> = [
    ['all', t('workspace.wards.all', { count: String(units.length) })],
    ['xa', t('workspace.wards.communes', { count: String(communeCount) })],
    ['phuong', t('workspace.wards.wards', { count: String(wardCount) })],
  ];
  return (
    <section className="workspace-card workspace-wards" aria-labelledby="workspace-wards-heading">
      <h3 id="workspace-wards-heading">
        {t('workspace.wards.heading', { count: String(units.length) })}
      </h3>
      <input
        type="search"
        className="workspace-wards__search"
        aria-label={t('workspace.wards.search')}
        placeholder={t('workspace.wards.search')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="workspace-chips" role="group" aria-label={t('workspace.wards.filterAria')}>
        {chips.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="workspace-empty">{t('workspace.wards.empty')}</p>
      ) : (
        <ul className="workspace-wards__list">
          {rows.map((unit) => (
            <li key={unit.code}>
              <button
                type="button"
                aria-pressed={selectedCode === unit.code}
                onClick={() => select(unit.code)}
              >
                <PinIcon />
                <span>
                  {t(unit.type === 'phuong' ? 'unitType.ward' : 'unitType.commune')} {unit.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProvinceMap() {
  const { t } = useTranslation();
  const selectedCode = useMapStore((state) => state.selectedCode);
  const select = useMapStore((state) => state.select);
  const count = String(wardPaths.length);
  return (
    <section className="workspace-card workspace-map" aria-labelledby="workspace-map-heading">
      <header className="workspace-map__title">
        <PinIcon />
        <div>
          <h3 id="workspace-map-heading">{t('workspace.map.heading')}</h3>
          <p>{t('workspace.map.subheading', { count })}</p>
        </div>
      </header>
      <svg
        className="workspace-map__svg"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label={t('workspace.map.aria', { count })}
      >
        {wardPaths.map((ward) => (
          <path
            key={ward.code}
            d={ward.d}
            data-type={ward.type}
            data-selected={ward.code === selectedCode || undefined}
            onClick={() => select(ward.code === selectedCode ? null : ward.code)}
          />
        ))}
        {/* Raise the selected polygon above its neighbours so its gold outline isn't clipped. */}
        {selectedCode && (
          <path
            className="workspace-map__selected"
            d={wardPaths.find((ward) => ward.code === selectedCode)?.d}
            pointerEvents="none"
          />
        )}
        <g className="workspace-map__labels" aria-hidden="true">
          {mapLabels.map((label) => (
            <text key={label.code} x={label.x} y={label.y} textAnchor="middle">
              {label.name}
            </text>
          ))}
        </g>
      </svg>
      <ul className="workspace-map__legend" aria-label={t('workspace.map.legend')}>
        <li data-swatch="xa">{t('workspace.map.legendCommune')}</li>
        <li data-swatch="phuong">{t('workspace.map.legendWard')}</li>
        <li data-swatch="selected">{t('workspace.map.legendSelected')}</li>
      </ul>
    </section>
  );
}

function QuickInfo({
  attention,
  onOpenPortfolio,
}: {
  attention: readonly ProjectAttentionItem[];
  onOpenPortfolio?: () => void;
}) {
  const { t, locale } = useTranslation();
  const selectedCode = useMapStore((state) => state.selectedCode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const setDetailMapCamera = useMapStore((state) => state.setDetailMapCamera);
  const unit = collection.features.find(
    ({ properties }) => properties.code === selectedCode,
  )?.properties;
  const label = selectedCode ? labelMap[selectedCode] : undefined;
  const metric = selectedCode ? metricMap[selectedCode] : undefined;
  const related = selectedCode
    ? attention.filter((item) => item.administrativeAreaCodes.includes(selectedCode))
    : [];

  const viewOnMap = () => {
    if (label) {
      setDetailMapCamera({
        latitude: label.latitude,
        longitude: label.longitude,
        zoom: 12,
        bearing: 0,
        pitch: 0,
      });
    }
    setViewMode('map');
  };

  return (
    <section className="workspace-card workspace-info" aria-labelledby="workspace-info-heading">
      <h3 id="workspace-info-heading">{t('workspace.info.heading')}</h3>
      {!unit ? (
        <p className="workspace-empty">{t('workspace.info.empty')}</p>
      ) : (
        <>
          <p className="workspace-info__name">
            {t(unit.type === 'phuong' ? 'unitType.ward' : 'unitType.commune')} {unit.name}
          </p>
          <dl className="workspace-info__facts">
            <div>
              <dt>{t('workspace.info.type')}</dt>
              <dd>{t(unit.type === 'phuong' ? 'unitType.ward' : 'unitType.commune')}</dd>
            </div>
            <div>
              <dt>{t('workspace.info.area')}</dt>
              <dd>{formatNumber(unit.areaKm2, locale)} km²</dd>
            </div>
            {metric && (
              <div>
                <dt>{t('workspace.info.population')}</dt>
                <dd>{formatNumber(metric.population, locale)}</dd>
              </div>
            )}
          </dl>
          <button type="button" className="workspace-info__primary" onClick={viewOnMap}>
            <PinIcon />
            {t('workspace.info.viewOnMap')}
          </button>
          <div className="workspace-info__projects">
            <div className="workspace-info__projects-head">
              <h4>{t('workspace.info.projectsHeading', { count: String(related.length) })}</h4>
              {onOpenPortfolio && (
                <button type="button" onClick={onOpenPortfolio}>
                  {t('workspace.info.viewAllProjects')}
                </button>
              )}
            </div>
            {related.length === 0 ? (
              <p className="workspace-empty">{t('workspace.info.noProjects')}</p>
            ) : (
              <ul>
                {related.map((item) => (
                  <li key={item.projectId}>
                    <span>{item.projectName}</span>
                    <small data-status={item.status}>{item.statusLabel}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/** Ward list + province map + quick info, laid out like the reference design. All three read and
 * write the shared `selectedCode`, so a pick in any of them updates the other two. */
export function OverviewWorkspace({
  attention,
  onOpenPortfolio,
}: {
  attention: readonly ProjectAttentionItem[];
  onOpenPortfolio?: () => void;
}) {
  return (
    <div className="overview-workspace">
      <WardList />
      <ProvinceMap />
      <QuickInfo attention={attention} onOpenPortfolio={onOpenPortfolio} />
    </div>
  );
}
