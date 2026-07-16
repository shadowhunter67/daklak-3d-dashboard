import { geoMercator } from 'd3-geo';
import { Shape, Vector2 } from 'three';
import type { GeoProjection } from 'd3-geo';
import type { MultiPolygon, Polygon, Position } from 'geojson';

export const projection: GeoProjection = geoMercator()
  .center([108.5, 12.7])
  .scale(150)
  .translate([0, 0]);
const ringToPoints = (ring: Position[]) =>
  ring.map(([lon, lat]) => {
    const p = projection([lon, lat])!;
    return new Vector2(p[0], -p[1]);
  });
export function geometryToShapes(geometry: Polygon | MultiPolygon): Shape[] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => {
    if (!polygon[0]) return [];
    const shape = new Shape(ringToPoints(polygon[0]));
    for (const hole of polygon.slice(1)) shape.holes.push(new Shape(ringToPoints(hole)));
    return [shape];
  });
}
export const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
