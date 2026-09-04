import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

/**
 * Pure geometry math for the "vẽ đường" (line draw-on) effect — mapeffect.app capability 2, a
 * corridor line growing from its start instead of just appearing. No MapLibre import (unit-
 * testable in isolation, same split as `lineDrawAnimation.ts`'s sibling `revealAnimation.ts`);
 * `MapLibreProvider.ts` owns the `requestAnimationFrame` loop and the `source.setData()` calls
 * that actually animate `key-projects-line`.
 *
 * Deliberately plain haversine-ish planar math, not a `turf` dependency — see AGENTS.md ("no new
 * abstraction without profiling"); at this precision (a handful of province-scale corridors,
 * downsampled to dozens of points each) the equirectangular approximation used here is more than
 * accurate enough for a cosmetic reveal.
 */

export const LINE_DRAW_DURATION_MS = 900;

const LAT_TO_KM = 111.32;

function segmentLengthKm(a: Position, b: Position): number {
  const midLatRad = (((a[1] + b[1]) / 2) * Math.PI) / 180;
  const dx = (b[0] - a[0]) * LAT_TO_KM * Math.cos(midLatRad);
  const dy = (b[1] - a[1]) * LAT_TO_KM;
  return Math.hypot(dx, dy);
}

/** Truncates a line to the leading `ratio` (0..1) fraction of its total length, interpolating the
 * final partial segment. Always returns at least 2 points (a degenerate zero-length line at
 * `ratio` 0, the full line at `ratio` >= 1). */
export function sliceLineByRatio(coordinates: Position[], ratio: number): Position[] {
  const r = Math.min(Math.max(ratio, 0), 1);
  if (coordinates.length < 2) return coordinates;
  if (r >= 1) return coordinates;

  const segmentLengths = [];
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const len = segmentLengthKm(coordinates[i - 1], coordinates[i]);
    segmentLengths.push(len);
    total += len;
  }
  if (total === 0) return [coordinates[0], coordinates[0]];

  const targetLength = total * r;
  if (targetLength <= 0) return [coordinates[0], coordinates[0]];

  let covered = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (covered + segLen >= targetLength) {
      const segRatio = segLen === 0 ? 0 : (targetLength - covered) / segLen;
      const a = coordinates[i];
      const b = coordinates[i + 1];
      const point: Position = [a[0] + (b[0] - a[0]) * segRatio, a[1] + (b[1] - a[1]) * segRatio];
      return [...coordinates.slice(0, i + 1), point];
    }
    covered += segLen;
  }
  return coordinates;
}

/** Applies `sliceLineByRatio` to every LineString feature in a collection, leaving every other
 * geometry type (Points) untouched. Used to progressively reveal `KEY_PROJECTS`'s corridor lines
 * while its point features stay at full opacity throughout (see `MapLibreProvider.setKeyProjectsVisible`). */
export function sliceFeatureCollectionLines<P>(
  collection: FeatureCollection<Geometry, P>,
  ratio: number,
): FeatureCollection<Geometry, P> {
  return {
    type: 'FeatureCollection',
    features: collection.features.map((feature): Feature<Geometry, P> => {
      if (feature.geometry.type !== 'LineString') return feature;
      return {
        ...feature,
        geometry: {
          type: 'LineString',
          coordinates: sliceLineByRatio(feature.geometry.coordinates, ratio),
        },
      };
    }),
  };
}
