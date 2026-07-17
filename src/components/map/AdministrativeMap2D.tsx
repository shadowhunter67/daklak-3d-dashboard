import { geoMercator, geoPath } from 'd3-geo';
import { useMemo } from 'react';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import { useMapStore } from '../../stores/mapStore';
import type { Metric, WardCollection } from '../../types/map';
import { RoadLayer2D } from './RoadLayer2D';

const collection = wards as WardCollection;
const metricMap = metrics as Record<string, Metric>;
const labelMap = labels as Record<string, { name: string; longitude: number; latitude: number }>;
const width = 900;
const height = 720;

function fillFor(code: string, mode: 'overview' | 'energy' | 'heatmap') {
  const metric = metricMap[code];
  if (!metric || mode === 'overview') return '#173f38';
  if (mode === 'energy') return `hsl(${42 + metric.coverage * 0.55} 52% 31%)`;
  return `hsl(${168 - metric.coverage * 1.05} 62% 34%)`;
}

export function AdministrativeMap2D() {
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

  return (
    <section className="administrative-map-2d" aria-labelledby="map-2d-title">
      <div className="map-2d-heading">
        <div>
          <p className="eyebrow">BẢN ĐỒ HÀNH CHÍNH 2D</p>
          <h2 id="map-2d-title" tabIndex={-1}>
            102 xã, phường
          </h2>
        </div>
        <p aria-live="polite">
          {selectedCode
            ? `Đang chọn ${labelMap[selectedCode]?.name ?? selectedCode}.`
            : 'Chưa chọn đơn vị.'}
        </p>
      </div>
      <svg
        className="administrative-map-2d__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Bản đồ hành chính 2D gồm ${collection.features.length} đơn vị. Dùng danh sách để truy cập bằng bàn phím.`}
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
        {roadsVisible && <RoadLayer2D projection={projection} />}
        {labelsVisible && (
          <g className="map-2d-labels" aria-hidden="true">
            {Object.entries(labelMap)
              .filter(([code]) => code === selectedCode || code === hoveredCode)
              .map(([code, label]) => {
                const point = projection([label.longitude, label.latitude]);
                return point ? (
                  <text key={code} x={point[0]} y={point[1]}>
                    {label.name}
                  </text>
                ) : null;
              })}
          </g>
        )}
      </svg>
      {roadsVisible && (
        <aside className="road-legend" aria-label="Chú giải đường giao thông">
          <span>
            <i className="road-key road-key--national" />
            Quốc lộ
          </span>
          <span>
            <i className="road-key road-key--provincial" />
            Tỉnh lộ
          </span>
          <span>
            <i className="road-key road-key--district" />
            Đường huyện
          </span>
          <small>© OpenStreetMap contributors · ODbL 1.0 · dữ liệu tham khảo</small>
        </aside>
      )}
      {dataMode !== 'overview' && (
        <p className="map-2d-note">Lớp màu sử dụng cùng bộ chỉ số minh họa với chế độ 3D.</p>
      )}
    </section>
  );
}
