import { useTexture } from '@react-three/drei';
import {
  displacementBias,
  displacementScale,
  terrainCenter,
  terrainColorUrl,
  terrainHeight,
  terrainHeightUrl,
  terrainMaskUrl,
  terrainNormalUrl,
  terrainSegments,
  terrainWidth,
} from '../../components/map/terrainConfig';

/**
 * Phase T1 (reports/tourism-digital-twin/) — the illustrative world scene's terrain surface.
 *
 * Deliberately NOT a reuse of `src/components/map/TerrainSurface.tsx` itself: that component
 * wires hover/click straight into `useMapStore`'s `hoveredCode`/`selectedCode` (the Executive
 * Overview / 3D analytical view's administrative-unit selection state) — reusing it here would
 * make clicking around the illustrative world scene silently mutate state that the existing `3d`
 * view's camera/selection logic reacts to (see `CameraControls.tsx`'s `selection-change`
 * handling), which is exactly the kind of "don't touch what already works" cross-talk the task
 * rules forbid.
 *
 * What IS reused, byte-for-byte, from the real GIS pipeline: the same terrain color/height/
 * normal/mask textures, the same real bbox-derived plane dimensions, and the same displacement
 * config as `TerrainSurface.tsx` — all sourced from `terrainConfig.ts`
 * (`scripts/generate_daklak_terrain.py` output under `src/assets/maps/daklak/`). No new terrain
 * data, no invented geometry.
 */
export function WorldTerrainMesh() {
  const [colorMap, heightMap, normalMap, alphaMap] = useTexture([
    terrainColorUrl,
    terrainHeightUrl,
    terrainNormalUrl,
    terrainMaskUrl,
  ]);

  return (
    <mesh position={terrainCenter} receiveShadow>
      <planeGeometry args={[terrainWidth, terrainHeight, ...terrainSegments]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        displacementMap={heightMap}
        displacementScale={displacementScale}
        displacementBias={displacementBias}
        alphaMap={alphaMap}
        alphaTest={0.25}
        roughness={0.82}
        metalness={0.02}
      />
    </mesh>
  );
}
