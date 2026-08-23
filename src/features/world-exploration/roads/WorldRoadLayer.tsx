import type { Position } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { loadRoads, type RoadClass, type RoadCollection } from '../../../data/loadRoads';
import { buildRoadGeometryBuckets } from '../../../components/map/roadLabels3D';
import { useTerrainSampler } from '../terrain/useTerrainSampler';
import { projectRoadPoint } from './worldRoadPoint';

/**
 * Phase T4 (reports/tourism-digital-twin/) — reuses the existing, already-shipped road-layer
 * dataset (`src/data/loadRoads.ts`'s `daklak-roads.json.gz`, the same one
 * `src/components/map/RoadLayer3D.tsx` renders for the `3d` view) inside `?view=world`, following
 * the same "reuse the data, not the component" pattern `WorldTerrainMesh.tsx` already set for the
 * terrain textures — `RoadLayer3D.tsx` itself is not reused (it reads/writes `useMapStore`'s
 * `labelsVisible` and renders administrative road *labels*, which this illustrative scene has no
 * equivalent state for — see `WorldTerrainMesh.tsx`'s doc comment for the general reasoning this
 * feature never cross-wires into the analytical `3d` view's store). What genuinely is reused,
 * byte-for-byte: `loadRoads()` (the fetch/decompress) and `roadLabels3D.ts`'s pure, already-tested
 * `buildRoadGeometryBuckets` — only the per-vertex projector (`projectRoadPoint`,
 * `worldRoadPoint.ts`) differs, ground-anchored to this scene's own shared terrain sampler instead
 * of `RoadLayer3D.tsx`'s separate height-pixel decode.
 *
 * No road name/reference labels are rendered here (unlike `RoadLayer3D.tsx`) — kept modest for
 * this illustrative scene; the line geometry alone is enough to orient a viewer relative to the
 * terrain and destination markers, and adding label placement/dedup logic on top of a route
 * dataset this scene has never rendered before is a reasonable follow-up, not required by this
 * phase's task.
 */

const ROAD_STYLES: Record<RoadClass, { color: string; opacity: number }> = {
  national: { color: '#ffd166', opacity: 1 },
  provincial: { color: '#f3a44a', opacity: 0.88 },
  district: { color: '#d9e5df', opacity: 0.55 },
};

export function WorldRoadLayer() {
  const sampler = useTerrainSampler();
  const [roads, setRoads] = useState<RoadCollection | null>(null);

  useEffect(() => {
    let active = true;
    loadRoads()
      .then((data) => {
        if (active) setRoads(data);
      })
      .catch(() => {
        // Non-fatal — the illustrative scene renders fine without the road layer (same tolerance
        // `useTerrainSampler.ts` documents for its own fetch failure).
      });
    return () => {
      active = false;
    };
  }, []);

  // Derived, not effect+setState: building the buffer geometries is a pure function of
  // `roads`/`sampler`, so `useMemo` avoids the extra render-then-effect cascade
  // `react-hooks/set-state-in-effect` (this repo's enforced lint rule) flags. `sampler` starts
  // `null` and resolves once — this recomputes exactly once more when it does, to ground-anchor
  // the initially-flat road geometry, same as `WorldDestinationMarkers.tsx`.
  const geometries = useMemo(() => {
    if (!roads) return null;
    const toPoint = (coordinate: Position) => projectRoadPoint(sampler, coordinate);
    const buckets = buildRoadGeometryBuckets(roads, toPoint);
    return Object.fromEntries(
      Object.entries(buckets).map(([roadClass, positions]) => {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        return [roadClass, geometry];
      }),
    ) as Record<RoadClass, BufferGeometry>;
  }, [roads, sampler]);

  useEffect(() => {
    return () => {
      if (geometries) Object.values(geometries).forEach((geometry) => geometry.dispose());
    };
  }, [geometries]);

  if (!geometries) return null;
  return (
    <>
      {(Object.keys(ROAD_STYLES) as RoadClass[]).map((roadClass) => (
        <lineSegments key={roadClass} geometry={geometries[roadClass]} raycast={() => null}>
          <lineBasicMaterial
            color={ROAD_STYLES[roadClass].color}
            transparent
            opacity={ROAD_STYLES[roadClass].opacity}
            depthWrite={false}
          />
        </lineSegments>
      ))}
    </>
  );
}
