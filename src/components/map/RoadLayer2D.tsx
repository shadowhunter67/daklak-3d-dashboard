import { geoPath, type GeoProjection } from 'd3-geo';
import { useEffect, useMemo, useState } from 'react';
import type { Position } from 'geojson';
import { loadRoads, type RoadCollection } from '../../data/loadRoads';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { useMapStore } from '../../stores/mapStore';
import { layoutMapLabels } from './labelLayout';

type LabelMap = Record<string, { longitude: number; latitude: number }>;

function projectedLine(
  coordinates: Position[],
  projection: GeoProjection,
): { points: [number, number][]; length: number } {
  const points = coordinates.map(
    (coordinate) => projection([coordinate[0], coordinate[1]])! as [number, number],
  );
  return {
    points,
    length: points.slice(1).reduce((sum, point, index) => {
      const previous = points[index];
      return sum + Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    }, 0),
  };
}

export function RoadLayer2D({
  projection,
  compact,
}: {
  projection: GeoProjection;
  compact: boolean;
}) {
  const labelsVisible = useMapStore((state) => state.labelsVisible);
  const [roads, setRoads] = useState<RoadCollection | null>(null);
  useEffect(() => {
    let active = true;
    void loadRoads().then((collection) => {
      if (active) setRoads(collection);
    });
    return () => {
      active = false;
    };
  }, []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const roadLabels = useMemo(() => {
    if (!roads) return [];
    const best = new Map<string, { point: [number, number]; length: number; priority: number }>();
    roads.features
      .filter((road) => road.properties.roadClass !== 'district')
      .forEach((road) => {
        const text = road.properties.reference?.trim() || road.properties.name?.trim();
        if (!text) return;
        const parts =
          road.geometry.type === 'LineString'
            ? [road.geometry.coordinates]
            : road.geometry.coordinates;
        parts.forEach((coordinates) => {
          const line = projectedLine(coordinates, projection);
          const current = best.get(text);
          if (!current || line.length > current.length) {
            best.set(text, {
              point: line.points[Math.floor(line.points.length / 2)],
              length: line.length,
              priority: road.properties.roadClass === 'national' ? 1 : 2,
            });
          }
        });
      });
    const administrativePoints = Object.values(labels as LabelMap)
      .map((label) => projection([label.longitude, label.latitude])! as [number, number])
      .filter(Boolean);
    const candidates = [...best.entries()]
      .map(([text, value]) => ({
        id: text,
        text,
        point: value.point,
        priority: value.priority,
      }))
      .filter((label) => {
        if (!labelsVisible) return true;
        const minimumDistance = label.priority === 1 ? 30 : 42;
        return !administrativePoints.some(
          (point) =>
            Math.hypot(point[0] - label.point[0], point[1] - label.point[1]) < minimumDistance,
        );
      });
    return layoutMapLabels(candidates, compact ? 6 : 10);
  }, [compact, labelsVisible, projection, roads]);
  if (!roads) return <g data-testid="roads-loading" />;
  return (
    <g className="map-roads" aria-label="Mạng lưới đường OpenStreetMap">
      {roads.features.map((road) => (
        <path
          key={road.properties.id}
          className={`map-road map-road--${road.properties.roadClass}`}
          d={path(road) ?? undefined}
          data-road-id={road.properties.id}
        />
      ))}
      <g className="map-road-labels" aria-hidden="true">
        {roadLabels.map((label) => (
          <text key={label.id} x={label.point[0]} y={label.point[1]}>
            {label.text}
          </text>
        ))}
      </g>
    </g>
  );
}
