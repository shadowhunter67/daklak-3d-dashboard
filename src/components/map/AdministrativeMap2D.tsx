import { geoMercator, geoPath } from 'd3-geo';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import { useMapStore } from '../../stores/mapStore';
import type { Metric, WardCollection } from '../../types/map';
import { RoadLayer2D } from './RoadLayer2D';
import { layoutMapLabels } from './labelLayout';
import { useTranslation } from '../../i18n/useTranslation';
import {
  FOCUS_IN_DURATION_MS,
  FOCUS_OUT_DURATION_MS,
  FULL_VIEW,
  MAP_VIEW_HEIGHT,
  MAP_VIEW_WIDTH,
  focusViewBox,
  interpolateViewBox,
  viewBoxesApproximatelyEqual,
  type ViewBoxRect,
} from './wardFocusView';

const collection = wards as WardCollection;
const metricMap = metrics as Record<string, Metric>;
const labelMap = labels as Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;
const width = MAP_VIEW_WIDTH;
const height = MAP_VIEW_HEIGHT;

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
  const reducedMotion = useMapStore((state) => state.reducedMotion);
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

  const focusFeature = useMemo(
    () =>
      selectedCode
        ? (collection.features.find((feature) => feature.properties.code === selectedCode) ?? null)
        : null,
    [selectedCode],
  );
  const focusPathData = useMemo(
    () => (focusFeature ? (path(focusFeature) ?? undefined) : undefined),
    [focusFeature, path],
  );

  // Bay/zoom mượt vào ward vừa chọn (hiệu ứng kiểu mapeffect.app) — điều khiển trực tiếp thuộc
  // tính `viewBox` bằng rAF thay vì qua React state, vì mỗi frame re-render lại ~100 <path> ward
  // sẽ tốn hơn hẳn so với việc chỉ set 1 attribute trên phần tử <svg>. `reducedMotion` được đọc
  // qua `getState()` (không subscribe) tại thời điểm bắt đầu animation: đổi setting hệ điều hành
  // giữa chừng không nên tự kích hoạt lại animation trên ward đang xem.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewRef = useRef<ViewBoxRect>(FULL_VIEW);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const target = focusFeature ? focusViewBox(path.bounds(focusFeature)) : FULL_VIEW;
    const from = viewRef.current;
    const duration = focusFeature ? FOCUS_IN_DURATION_MS : FOCUS_OUT_DURATION_MS;
    const reduced = useMapStore.getState().reducedMotion;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const apply = (rect: ViewBoxRect) => {
      viewRef.current = rect;
      svg.setAttribute('viewBox', `${rect.x} ${rect.y} ${rect.width} ${rect.height}`);
      svg.style.setProperty('--map-2d-zoom', String(MAP_VIEW_WIDTH / rect.width));
    };

    if (reduced || viewBoxesApproximatelyEqual(from, target)) {
      apply(target);
      return;
    }

    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      apply(interpolateViewBox(from, target, t));
      rafRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [focusFeature, path]);

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
        ref={svgRef}
        className="administrative-map-2d__svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{ '--map-2d-zoom': 1 } as CSSProperties}
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
        {focusPathData && (
          <g
            className={`map-2d-highlight${reducedMotion ? ' is-static' : ''}`}
            aria-hidden="true"
            key={selectedCode}
          >
            <path className="map-2d-highlight__glow" d={focusPathData} />
            <path className="map-2d-highlight__draw" d={focusPathData} pathLength={1} />
          </g>
        )}
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
