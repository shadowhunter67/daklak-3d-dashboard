import type { Geometry, Position } from 'geojson';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import type { WardCollection } from '../../types/map';

const data = wards as WardCollection;
type Bounds = [
  minLongitude: number,
  minLatitude: number,
  maxLongitude: number,
  maxLatitude: number,
];

function visitPositions(geometry: Geometry, visit: (position: Position) => void) {
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((part) => visitPositions(part, visit));
    return;
  }
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  polygons.forEach((polygon) => polygon.forEach((ring) => ring.forEach(visit)));
}

function boundsOf(geometry: Geometry): Bounds {
  const bounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  visitPositions(geometry, ([longitude, latitude]) => {
    bounds[0] = Math.min(bounds[0], longitude);
    bounds[1] = Math.min(bounds[1], latitude);
    bounds[2] = Math.max(bounds[2], longitude);
    bounds[3] = Math.max(bounds[3], latitude);
  });
  return bounds;
}

const indexedFeatures = data.features.map((feature) => ({
  feature,
  bounds: boundsOf(feature.geometry),
}));

function boundsContain([longitude, latitude]: [number, number], bounds: Bounds) {
  return (
    longitude >= bounds[0] &&
    longitude <= bounds[2] &&
    latitude >= bounds[1] &&
    latitude <= bounds[3]
  );
}

function ringContains([longitude, latitude]: [number, number], ring: Position[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    if (
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude
    )
      inside = !inside;
  }
  return inside;
}

export function geometryContains(point: [number, number], geometry: Geometry): boolean {
  if (geometry.type === 'GeometryCollection')
    return geometry.geometries.some((part) => geometryContains(point, part));
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return false;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (polygon) =>
      Boolean(polygon[0]) &&
      ringContains(point, polygon[0]) &&
      !polygon.slice(1).some((hole) => ringContains(point, hole)),
  );
}

export const featureAt = (point: [number, number]) =>
  indexedFeatures.find(
    ({ feature, bounds }) =>
      boundsContain(point, bounds) && geometryContains(point, feature.geometry),
  )?.feature;

export { data as wardData };
