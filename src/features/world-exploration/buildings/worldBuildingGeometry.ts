import { ExtrudeGeometry } from 'three';
import { geometryToShapes } from '../../../utils/geo';
import { metersToWorld } from '../coordinates/worldScale';
import type { BuildingCollection } from '../../../data/loadBuildings';

/**
 * True 1:1 real-world height, via the shared `metersToWorld` conversion
 * (`coordinates/worldScale.ts`) — not an independently-tuned scale. This replaces two earlier
 * versions (`0.08` linear, then `0.12 * sqrt(meters)`, then `0.015 * sqrt(meters)`) that were each
 * tuned "by feel" against the walking camera's eye height in isolation, without a shared
 * ground-truth ratio to check against. The first version shipped a real bug: the one real 19-story
 * tower in this dataset ("Chung cư Hoàng Anh BIDV", `osm-way-228989476`, 62.7m) rendered ~1-5 world
 * units tall — a sizable fraction of the entire province's ~5.16-unit width — a spike piercing
 * off-screen from the overview camera (fixed ad hoc in PR #105, root-caused and fixed properly
 * here — see `reports/tourism-digital-twin/world-scale-lod-adr.md`'s Question 2 for why objects
 * use the *horizontal* true scale, not terrain's exaggerated vertical one).
 *
 * Trade-off, now principled rather than incidental: buildings are genuinely tiny relative to the
 * whole-province overview camera (a real building IS nearly invisible at that zoom in reality
 * too), and at true scale a footprint's own width and its extruded height are finally
 * proportionate to each other — no more needle-shaped buildings relative to their own base. Making
 * buildings *read* as tall from the walking camera without reintroducing the spike needs the
 * camera's own near/far and altitude-relative behavior to change (PR3 in the same sequence), not a
 * further height hack.
 */
export function buildingHeightWorldUnits(heightMeters: number): number {
  return metersToWorld(Math.max(0, heightMeters));
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
