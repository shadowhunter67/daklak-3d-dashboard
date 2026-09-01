import { ExtrudeGeometry } from 'three';
import { geometryToShapes } from '../../../utils/geo';
import type { BuildingCollection } from '../../../data/loadBuildings';

/**
 * Illustrative real-height -> world-unit scale for extruded buildings, empirically tuned (not
 * derived from a literal meters-per-world-unit ratio — nothing else placed directly in this scene
 * is either, e.g. `WALK_SPEED`/`FLY_SPEED` in `playerMovement.ts`) against a real regression this
 * pilot shipped and had to fix:
 *
 * A first version (`0.08` linear, later `0.12 * sqrt(meters)`) was tuned only against the walking
 * camera's eye height (`PlayerRig.tsx`'s `EYE_HEIGHT = 0.16`). It missed that footprints
 * (`geometryToShapes`) sit in this scene's *true*, Mercator-accurate horizontal scale — a real
 * building footprint is only ~0.0003-0.003 world units wide — while `EYE_HEIGHT`/
 * `TOUR_CAMERA_HEIGHT` are already a ~1000x *game*-scale exaggeration over true-to-life, chosen for
 * player legibility, not geometric consistency with the footprints. Tuning height against the
 * player made this dataset's one real 19-story tower ("Chung cư Hoàng Anh BIDV",
 * `osm-way-228989476`, 62.7m) render ~1 world unit tall — a fifth of this scene's entire terrain
 * width (`terrainConfig.ts`'s `terrainWidth`, ~5.16) — a single spike piercing off-screen from the
 * province overview camera, confirmed live via `?view=world` in a browser (this pilot's original
 * ship missed that check — see PR history).
 *
 * `0.015 * sqrt(meters)` was then re-tuned empirically (rebuild + look, repeatedly) against the
 * *overview* camera instead, so the tallest real building in this dataset stays a small, clearly
 * -bounded bump rather than a spike (`worldBuildingGeometry.test.ts` encodes that bound as a
 * regression guard). Known, accepted limitation of that trade-off: at this scale, ordinary 1-story
 * buildings (`BUILDING_HEIGHT_SCALE * sqrt(3.3) ≈ 0.027`) sit *below* the walking camera's eye
 * height rather than towering over it — up close, this pilot's buildings read as low, honestly
 * true-footprint-shaped massing rather than photorealistic 1:1 buildings. Making them read as
 * "tall" at walking distance without breaking the overview camera would need footprints drawn
 * larger than their real extent (a further, deliberately not-yet-made design decision — see
 * `docs/data-provenance.md`'s building-footprints section).
 */
export const BUILDING_HEIGHT_SCALE = 0.015;

export function buildingHeightWorldUnits(heightMeters: number): number {
  return BUILDING_HEIGHT_SCALE * Math.sqrt(Math.max(0, heightMeters));
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
