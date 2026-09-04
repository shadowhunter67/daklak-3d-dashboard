import type { Geometry, Position } from 'geojson';
import { KEY_PROJECTS } from './keyProjects';
import { PLANNING_ZONES } from './planningZones';
import wardLabels from '../../assets/maps/daklak/daklak-labels.json';

/**
 * mapeffect.app capability 3 ("Marker & tiện ích — hiện khoảng cách quanh khu đất"), scoped to
 * this repo's no-fabrication rule: there is no real amenity/POI source layer (school, hospital,
 * market) bundled or configured, so this does NOT invent one. Instead it answers the same
 * question — "what's within N km of this point?" — using the three REAL datasets already loaded
 * elsewhere in the detail map: `keyProjects.ts` (sourced infrastructure projects),
 * `planningZones.ts` (sourced approved zones), and `daklak-labels.json` (ward/commune centres,
 * the same bundled data `wardLabelLayers.ts`/`localSearchIndex.ts` already ship).
 *
 * Pure geometry — no MapLibre dependency, so it's usable from both the tool panel and unit tests.
 * Distances are haversine great-circle to the nearest VERTEX of a feature's geometry (not a true
 * point-to-line/polygon-edge distance), which is a documented approximation: good enough to rank
 * "near vs. far" for a reference tool, not survey-grade. Matches this module's existing
 * `distanceMeasurement.ts` haversine, duplicated rather than imported to keep this file
 * self-contained and trivially unit-testable without pulling in the measurement tool's UI types.
 */

export interface RadiusQueryPoint {
  latitude: number;
  longitude: number;
}

export type RadiusMatchKind = 'key-project' | 'planning-zone' | 'ward';

export interface RadiusMatch {
  id: string;
  name: string;
  kind: RadiusMatchKind;
  distanceMeters: number;
}

/** 1 km / 3 km / 5 km / 10 km — coarse enough to be useful at the province's scale, matching the
 * zoom levels the reference layers themselves are legible at. */
export const RADIUS_PRESETS_METERS = [1000, 3000, 5000, 10000] as const;

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceMeters(a: RadiusQueryPoint, b: RadiusQueryPoint): number {
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinHalfLat = Math.sin(deltaLat / 2);
  const sinHalfLng = Math.sin(deltaLng / 2);
  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Flattens any GeoJSON geometry (Point/LineString/Polygon/Multi*) down to its raw [lng, lat]
 * vertices — recursing through nested coordinate arrays regardless of depth. */
function collectPositions(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates;
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.flat();
    case 'MultiPolygon':
      return geometry.coordinates.flat(2);
    case 'GeometryCollection':
      return geometry.geometries.flatMap(collectPositions);
    default:
      return [];
  }
}

function nearestVertexDistanceMeters(center: RadiusQueryPoint, geometry: Geometry): number {
  const positions = collectPositions(geometry);
  let nearest = Infinity;
  for (const [longitude, latitude] of positions) {
    const distance = haversineDistanceMeters(center, { latitude, longitude });
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

export function queryKeyProjectsWithinRadius(
  center: RadiusQueryPoint,
  radiusMeters: number,
): RadiusMatch[] {
  const matches: RadiusMatch[] = [];
  for (const feature of KEY_PROJECTS.features) {
    const distanceMeters = nearestVertexDistanceMeters(center, feature.geometry);
    if (distanceMeters <= radiusMeters) {
      matches.push({
        id: feature.properties.id,
        name: feature.properties.name,
        kind: 'key-project',
        distanceMeters,
      });
    }
  }
  return matches;
}

export function queryPlanningZonesWithinRadius(
  center: RadiusQueryPoint,
  radiusMeters: number,
): RadiusMatch[] {
  const matches: RadiusMatch[] = [];
  for (const feature of PLANNING_ZONES.features) {
    const distanceMeters = nearestVertexDistanceMeters(center, feature.geometry);
    if (distanceMeters <= radiusMeters) {
      matches.push({
        id: feature.properties.id,
        name: feature.properties.name,
        kind: 'planning-zone',
        distanceMeters,
      });
    }
  }
  return matches;
}

interface WardLabelEntry {
  name: string;
  longitude: number;
  latitude: number;
  priority: number;
}

export function queryWardLabelsWithinRadius(
  center: RadiusQueryPoint,
  radiusMeters: number,
): RadiusMatch[] {
  const entries = wardLabels as Record<string, WardLabelEntry>;
  const matches: RadiusMatch[] = [];
  for (const [code, entry] of Object.entries(entries)) {
    const distanceMeters = haversineDistanceMeters(center, entry);
    if (distanceMeters <= radiusMeters) {
      matches.push({ id: code, name: entry.name, kind: 'ward', distanceMeters });
    }
  }
  return matches;
}

/** Everything within `radiusMeters` of `center`, across all three real datasets, nearest first. */
export function queryRadius(center: RadiusQueryPoint, radiusMeters: number): RadiusMatch[] {
  return [
    ...queryKeyProjectsWithinRadius(center, radiusMeters),
    ...queryPlanningZonesWithinRadius(center, radiusMeters),
    ...queryWardLabelsWithinRadius(center, radiusMeters),
  ].sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function formatRadiusDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km`;
}
