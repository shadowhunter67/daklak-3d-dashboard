import { geoMercator, geoPath } from 'd3-geo';
import { useEffect, useMemo, useState } from 'react';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import { useMapStore } from '../../stores/mapStore';
import type { Metric, WardCollection } from '../../types/map';
import { RoadLayer2D } from './RoadLayer2D';
import { layoutMapLabels } from './labelLayout';
import { useTranslation } from '../../i18n/useTranslation';

const collection = wards as WardCollection;
const metricMap = metrics as Record<string, Metric>;
const labelMap = labels as Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;
const width = 900;
const height = 720;

function fillFor(code: string, mode: 'overview' | 'energy' | 'heatmap') {
  const metric = metricMap[code];
  if (!metric || mode === 'overview') return '#173f38';
  if (mode === 'energy') return `hsl(${42 + metric.coverage * 0.55} 52% 31%)`;
  return `hsl(${168 - metric.coverage * 1.05} 62% 34%)`;
}

export function AdministrativeMap2D() {
  const { t } = useTranslation();
  const [compactLabels, setCompactLabels] = useState(() => window.innerWidth < 600);
  const dataMode = useMapStore((state) => state.dataMode);
  const selectedCode = useMapStore((state) => state.selectedCode);
  const hoveredCode = useMapStore((state) => state.hoveredCode);
  const labelsVisible = useMapStore((state) => state.labelsVisible);
  const roadsVisible = useMapStore((state) => state.roadsVisible);
  const select = useMapStore((state) => state.select);
  const setHovered = useMapStore((state) => state.setHovered);
  const { path, projection } = useMemo(() => {
    const fitted = geoMercator().fitExtent(
      [
        [28, 28],
        [width - 28, height - 28],
      ],
      collection,
    );
    return { path: geoPath(fitted), projection: fitted };
  }, []);
  useEffect(() => {
    const update = () => setCompactLabels(window.innerWidth < 600);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const visibleLabels = useMemo(
    () =>
      layoutMapLabels(
        Object.entries(labelMap).map(([code, label]) => ({
          id: code,
          text: label.name,
          point: projection([label.longitude, label.latitude])! as [number, number],
          priority: label.priority,
          emphasized: code === selectedCode || code === hoveredCode,
        })),
        compactLabels ? 34 : 72,
      ),
    [compactLabels, hoveredCode, projection, selectedCode],
  );

  return (
    <section className="administrative-map-2d" aria-labelledby="map-2d-title">
      <div className="map-2d-heading">
        <div>
          <p className="eyebrow">{t('map2d.eyebrow')}</p>
          <h2 id="map-2d-title" tabIndex={-1}>
            {t('map2d.heading')}
          </h2>
        </div>
        <p aria-live="polite">
          {selectedCode
            ? t('map2d.selected', { name: labelMap[selectedCode]?.name ?? selectedCode })
            : t('map2d.noneSelected')}
        </p>
      </div>
      <svg
        className="administrative-map-2d__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('map2d.svgAria', { count: collection.features.length })}
        onPointerLeave={() => setHovered(null)}
      >
        <g className={`map-2d-polygons map-2d-polygons--${dataMode}`}>
          {collection.features.map((feature) => {
            const { code } = feature.properties;
            const selected = selectedCode === code;
            const hovered = hoveredCode === code;
            return (
              <path
                key={code}
                d={path(feature) ?? undefined}
                fill={fillFor(code, dataMode)}
                className={`${selected ? 'is-selected' : ''}${hovered ? ' is-hovered' : ''}`}
                data-code={code}
                onPointerEnter={() => setHovered(code)}
                onClick={() => select(selected ? null : code)}
              />
            );
          })}
        </g>
        {roadsVisible && <RoadLayer2D projection={projection} compact={compactLabels} />}
        {labelsVisible && (
          <g className="map-2d-labels" aria-hidden="true">
            {visibleLabels.map((label) => (
              <text
                key={label.id}
                x={label.point[0]}
                y={label.point[1]}
                className={label.emphasized ? 'is-emphasized' : undefined}
                data-label-code={label.id}
              >
                {label.text}
              </text>
            ))}
          </g>
        )}
      </svg>
      {roadsVisible && (
        <aside className="road-legend" aria-label={t('map2d.roadLegendAria')}>
          <span>
            <i className="road-key road-key--national" />
            {t('map2d.roadNational')}
          </span>
          <span>
            <i className="road-key road-key--provincial" />
            {t('map2d.roadProvincial')}
          </span>
          <span>
            <i className="road-key road-key--district" />
            {t('map2d.roadDistrict')}
          </span>
          <small>{t('map2d.osmAttribution')}</small>
        </aside>
      )}
      {dataMode !== 'overview' && <p className="map-2d-note">{t('map2d.colorNote')}</p>}
    </section>
  );
}
