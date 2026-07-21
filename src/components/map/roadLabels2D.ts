import type { GeoProjection } from 'd3-geo';
import type { Position } from 'geojson';
import type { RoadCollection } from '../../data/loadRoads';
import { layoutMapLabels, type MapLabelCandidate } from './labelLayout';

export function projectedLine(
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

export function buildRoadLabels2D(
  roads: RoadCollection,
  administrativePoints: [number, number][],
  projection: GeoProjection,
  labelsVisible: boolean,
  compact: boolean,
): ReturnType<typeof layoutMapLabels> {
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
  const candidates: MapLabelCandidate[] = [...best.entries()]
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
}
