import { useEffect, useMemo, useState } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { loadBuonMaThuotBuildings, type BuildingCollection } from '../../../data/loadBuildings';
import { FALLBACK_GROUND_HEIGHT } from '../player/movement/playerMovement';
import { useTerrainSampler } from '../terrain/useTerrainSampler';
import { buildBuildingGeometryData } from './worldBuildingGeometry';

/**
 * Pilot 3D building layer — real OpenStreetMap footprints for one ward (phường Buôn Ma Thuột, code
 * 24133), extruded to an illustrative height (see `worldBuildingGeometry.ts`'s doc comment for the
 * scale, and `scripts/build_daklak_buildings.py` for how the dataset itself was built and why it
 * covers only this one ward rather than the whole province). Follows the same "reuse the data, not
 * assume a component" fetch/geometry-build pattern `WorldRoadLayer.tsx` set for roads — the only
 * new part is the extrusion math (`worldBuildingGeometry.ts`), since no prior layer in this scene
 * renders solid (non-line) geometry.
 *
 * Massing only — flat OSM tag defaults for buildings without a real height/level count (see
 * `heightMethod` on each feature), a single neutral material, no per-building interaction. A
 * reasonable follow-up, not required by this pilot: color/vary by `buildingType`, click-to-inspect,
 * or extending the same pipeline to more wards once this one is validated.
 */
export function WorldBuildingsLayer() {
  const sampler = useTerrainSampler();
  const [buildings, setBuildings] = useState<BuildingCollection | null>(null);

  useEffect(() => {
    let active = true;
    loadBuonMaThuotBuildings()
      .then((data) => {
        if (active) setBuildings(data);
      })
      .catch(() => {
        // Non-fatal — same tolerance `WorldRoadLayer.tsx`/`useTerrainSampler.ts` document for
        // their own fetch failures: the illustrative scene renders fine without this layer.
      });
    return () => {
      active = false;
    };
  }, []);

  // Derived, not effect+setState — see `WorldRoadLayer.tsx`'s doc comment for why this project's
  // `react-hooks/set-state-in-effect` lint rule pushes geometry construction into `useMemo`.
  const geometry = useMemo(() => {
    if (!buildings || buildings.features.length === 0) return null;
    const groundHeightAt = (x: number, z: number) => sampler?.getHeight(x, z) ?? null;
    const data = buildBuildingGeometryData(buildings, groundHeightAt, FALLBACK_GROUND_HEIGHT);
    const bufferGeometry = new BufferGeometry();
    bufferGeometry.setAttribute('position', new Float32BufferAttribute(data.positions, 3));
    bufferGeometry.setAttribute('normal', new Float32BufferAttribute(data.normals, 3));
    return bufferGeometry;
  }, [buildings, sampler]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;
  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshStandardMaterial color="#c9beac" roughness={0.9} metalness={0} />
    </mesh>
  );
}
