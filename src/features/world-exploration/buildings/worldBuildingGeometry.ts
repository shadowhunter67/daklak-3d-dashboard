import { ExtrudeGeometry } from 'three';
import { geometryToShapes } from '../../../utils/geo';
import type { BuildingCollection } from '../../../data/loadBuildings';

/**
 * Illustrative real-height -> world-unit scale for extruded buildings, tuned by feel against this
 * scene's existing human-scale constants — nothing else in this scene is derived from a literal
 * meters-per-world-unit ratio either (`WALK_SPEED`/`FLY_SPEED` in `playerMovement.ts` are the same
 * "tuned by feel" kind of constant). A typical 1-story building (~3.3m, matching
 * `build_daklak_buildings.py`'s `METERS_PER_LEVEL`) should read as clearly taller than the walking
 * camera's eye height (`PlayerRig.tsx`'s `EYE_HEIGHT = 0.16` world units), and a multi-story
 * landmark should still register from the tour camera's aerial vantage
 * (`TourRig.tsx`'s `TOUR_CAMERA_HEIGHT = 1.3` world units).
 */
export const BUILDING_WORLD_UNITS_PER_METER = 0.08;

export function buildingHeightWorldUnits(heightMeters: number): number {
  return heightMeters * BUILDING_WORLD_UNITS_PER_METER;
}

export interface BuildingGeometryData {
  positions: Float32Array;
  normals: Float32Array;
}

/**
 * Ground-anchors and extrudes every building footprint into one merged, non-indexed triangle set
 * (positions + normals) — the same "one component, one draw call" outcome `WorldRoadLayer.tsx`
 * reaches for lines, adapted for solid geometry (there is no existing extrude layer in this scene
 * to reuse the way roads reuse `roadLabels3D.ts`).
 *
 * `geometryToShapes` (`utils/geo.ts`) already projects a footprint's lon/lat ring into this scene's
 * shared Mercator plane via the same `projection` `latLonToWorld` uses, as `(mercatorX, -mercatorY)`
 * — exactly the pre-rotation local (x, y) convention every other object in `WorldScene.tsx`'s
 * rotated `<group>` follows (see `coordinates/worldCoordinates.ts`'s doc comment: pre-rotation
 * local Z is the vertical axis after the group's rotation). `ExtrudeGeometry` extrudes a Shape
 * along local Z by construction, so translating the extruded geometry by the sampled ground height
 * on that same axis (`geometry.translate(0, 0, groundZ)`) places it correctly with no further
 * transform needed — the merged geometry can be rendered with an identity-position `<mesh>`.
 *
 * One ground-height sample per building (its footprint centroid), not per vertex — a building's
 * own footprint is small enough relative to the terrain's undulation that this is a reasonable
 * simplification (unlike `WorldRoadLayer.tsx`'s roads, which can span long distances across
 * varying terrain).
 */
export function buildBuildingGeometryData(
  buildings: BuildingCollection,
  groundHeightAt: (x: number, z: number) => number | null,
  fallbackGroundHeight: number,
): BuildingGeometryData {
  const positionChunks: Float32Array[] = [];
  const normalChunks: Float32Array[] = [];

  for (const feature of buildings.features) {
    const shapes = geometryToShapes(feature.geometry);
    if (shapes.length === 0) continue;
    const depth = buildingHeightWorldUnits(feature.properties.heightMeters);

    for (const shape of shapes) {
      const points = shape.getPoints();
      if (points.length === 0) continue;
      let sumX = 0;
      let sumY = 0;
      for (const point of points) {
        sumX += point.x;
        sumY += point.y;
      }
      // shape.y is already `-mercatorY` (see doc comment above) — negate back for the sampler,
      // which works in the same (x, z) = (mercatorX, mercatorY) space as `latLonToWorld`.
      const centroidX = sumX / points.length;
      const centroidZ = -(sumY / points.length);
      const groundZ = groundHeightAt(centroidX, centroidZ) ?? fallbackGroundHeight;

      const extruded = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
      extruded.translate(0, 0, groundZ);
      const flat = extruded.index ? extruded.toNonIndexed() : extruded;
      const position = flat.getAttribute('position');
      const normal = flat.getAttribute('normal');
      if (position) positionChunks.push(position.array as Float32Array);
      if (normal) normalChunks.push(normal.array as Float32Array);
      extruded.dispose();
      if (flat !== extruded) flat.dispose();
    }
  }

  return {
    positions: concatFloat32(positionChunks),
    normals: concatFloat32(normalChunks),
  };
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}
