import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import wards from '#province-assets/daklak-wards-render.json';
import labels from '#province-assets/daklak-labels.json';
import { unitMetrics } from '../../data/unitMetrics';
import {
  layoutOverviewLabels,
  OVERVIEW_LABEL_FONT_SIZE,
  overviewLabelTextLength,
} from './overviewMapLabels';
import { formatSubUnits } from '../../data/formatSubUnits';
import { getUnitProfile } from '../../data/unitProfiles';
import type { Metric, WardCollection } from '../../types/map';
import { sortAdministrativeUnits } from '../../utils/administrativeUnits';
import { normalizeSearchText } from '../../utils/search';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { formatNumber } from '../../i18n/formatters';
import {
  serializePortfolioHash,
  serializeReportsHash,
  serializeUnitHash,
} from '../../routing/hashRoute';
import { useHashRoute } from '../../routing/useHashRoute';
import { Card, PanelHeader, StatList } from '../../components/ui';
import { BuildingIcon, ListIcon, MapIcon, PinIcon } from '../../components/layout/icons';

const collection = wards as WardCollection;
const metricMap = unitMetrics as Partial<Record<string, Metric>>;
const labelMap = labels as Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;
const units = sortAdministrativeUnits(collection.features.map(({ properties }) => properties));

const MAP_WIDTH = 640;
const MAP_HEIGHT = 560;
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
// All 102 names are drawn (never filtered by priority); colliding ones are displaced with a leader
// line back to their true position. See overviewMapLabels.ts.
const mapLabels = layoutOverviewLabels(
  Object.entries(labelMap).flatMap(([code, label]) => {
    const point = projection([label.longitude, label.latitude]);
    return point
      ? [{ code, name: label.name, x: point[0], y: point[1], priority: label.priority }]
      : [];
  }),
);

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
    <Card className="overview-workspace__directory" aria-labelledby="workspace-wards-heading">
      <PanelHeader
        title={t('workspace.wards.heading', { count: String(units.length) })}
        icon={<ListIcon />}
        headingId="workspace-wards-heading"
      />
      <input
        type="search"
        className="overview-workspace__search"
        aria-label={t('workspace.wards.search')}
        placeholder={t('workspace.wards.search')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div
        className="overview-workspace__filters"
        role="group"
        aria-label={t('workspace.wards.filterAria')}
      >
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
        <p className="overview-workspace__empty">{t('workspace.wards.empty')}</p>
      ) : (
        <ul className="overview-workspace__directory-list">
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
    </Card>
  );
}

function ProvinceMap() {
  const { t } = useTranslation();
  const selectedCode = useMapStore((state) => state.selectedCode);
  const select = useMapStore((state) => state.select);
  const count = String(wardPaths.length);
  return (
    <Card className="overview-workspace__map" aria-labelledby="workspace-map-heading">
      <PanelHeader
        title={t('workspace.map.heading')}
        icon={<MapIcon />}
        headingId="workspace-map-heading"
      />
      <p className="overview-workspace__map-subtitle">{t('workspace.map.subheading', { count })}</p>
      <div className="overview-workspace__map-canvas">
        <svg
          className="overview-workspace__map-svg"
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
          {selectedCode && (
            <path
              className="overview-workspace__map-selected"
              d={wardPaths.find((ward) => ward.code === selectedCode)?.d}
              pointerEvents="none"
            />
          )}
          <g className="overview-workspace__map-labels" aria-hidden="true">
            {mapLabels
              .filter((label) => label.displaced)
              .map((label) => (
                <line
                  key={`leader-${label.code}`}
                  x1={label.anchorX}
                  y1={label.anchorY}
                  x2={label.x}
                  y2={label.y}
                  className="overview-workspace__map-leader"
                />
              ))}
            {mapLabels.map((label) => (
              <text
                key={label.code}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={OVERVIEW_LABEL_FONT_SIZE}
                textLength={overviewLabelTextLength(label.name)}
                lengthAdjust="spacingAndGlyphs"
                data-selected={label.code === selectedCode || undefined}
              >
                {label.name}
              </text>
            ))}
          </g>
        </svg>
        <ul className="overview-workspace__legend" aria-label={t('workspace.map.legend')}>
          <li data-swatch="xa">{t('workspace.map.legendCommune')}</li>
          <li data-swatch="phuong">{t('workspace.map.legendWard')}</li>
          <li data-swatch="selected">{t('workspace.map.legendSelected')}</li>
        </ul>
      </div>
    </Card>
  );
}

function QuickInfo({
  projectCountByAdministrativeArea,
}: {
  projectCountByAdministrativeArea: Record<string, number>;
}) {
  const { t, locale } = useTranslation();
  const { navigate } = useHashRoute();
  const selectedCode = useMapStore((state) => state.selectedCode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const setDetailMapCamera = useMapStore((state) => state.setDetailMapCamera);
  const unit = collection.features.find(
    ({ properties }) => properties.code === selectedCode,
  )?.properties;
  const label = selectedCode ? labelMap[selectedCode] : undefined;
  const metric = selectedCode ? metricMap[selectedCode] : undefined;
  const profile = selectedCode ? getUnitProfile(selectedCode) : undefined;
  const projectCount = selectedCode ? (projectCountByAdministrativeArea[selectedCode] ?? 0) : 0;

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
    <Card className="overview-workspace__info" aria-labelledby="workspace-info-heading">
      <PanelHeader
        title={t('workspace.info.heading')}
        icon={<BuildingIcon />}
        headingId="workspace-info-heading"
      />
      {!unit ? (
        <div className="overview-workspace__empty overview-workspace__empty--info">
          <PinIcon />
          <p>{t('workspace.info.empty')}</p>
        </div>
      ) : (
        <>
          <p className="overview-workspace__unit-name">
            <PinIcon />
            <span>
              {t(unit.type === 'phuong' ? 'unitType.ward' : 'unitType.commune')} {unit.name}
            </span>
          </p>
          <StatList
            items={[
              {
                label: t('workspace.info.type'),
                value: t(unit.type === 'phuong' ? 'unitType.ward' : 'unitType.commune'),
              },
              {
                label: t('workspace.info.area'),
                value: `${formatNumber(unit.areaKm2, locale)} km²`,
              },
              ...(metric
                ? [
                    {
                      label: t('workspace.info.population'),
                      value: formatNumber(metric.population, locale),
                    },
                  ]
                : []),
              ...(profile
                ? [{ label: t('workspace.info.subUnits'), value: formatSubUnits(profile, t) }]
                : []),
            ]}
          />
          <button type="button" className="overview-workspace__primary" onClick={viewOnMap}>
            <PinIcon />
            {t('workspace.info.viewOnMap')}
          </button>
          <div className="overview-workspace__actions">
            {projectCount > 0 && selectedCode && (
              <button
                type="button"
                className="overview-workspace__secondary"
                onClick={() => navigate(serializePortfolioHash({ area: selectedCode }))}
              >
                {t('workspace.info.viewProjects', { count: String(projectCount) })}
              </button>
            )}
            {selectedCode && (
              <button
                type="button"
                className="overview-workspace__secondary"
                onClick={() => navigate(serializeUnitHash(selectedCode))}
              >
                {t('workspace.info.viewProfile')}
              </button>
            )}
            <button
              type="button"
              className="overview-workspace__secondary"
              onClick={() => navigate(serializeReportsHash())}
            >
              {t('workspace.info.viewReports')}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

/** Danh sách địa bàn, bản đồ hành chính và thông tin nhanh dùng chung `selectedCode`. */
export function OverviewWorkspace({
  projectCountByAdministrativeArea,
}: {
  projectCountByAdministrativeArea: Record<string, number>;
}) {
  return (
    <div className="overview-workspace">
      <WardList />
      <ProvinceMap />
      <QuickInfo projectCountByAdministrativeArea={projectCountByAdministrativeArea} />
    </div>
  );
}
