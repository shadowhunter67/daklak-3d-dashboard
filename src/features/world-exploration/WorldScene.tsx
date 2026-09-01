import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { getGraphicsQualityConfigForCurrentDevice } from '../../utils/graphicsQuality';
import { MapLoading } from '../../components/map/MapFallback';
import { WorldBuildingsLayer } from './buildings/WorldBuildingsLayer';
import { WorldDestinationMarkers } from './WorldDestinationMarkers';
import { WorldFlyInCamera, FLY_IN_DURATION_SECONDS } from './WorldFlyInCamera';
import { WorldTerrainMesh } from './WorldTerrainMesh';
import { PlayerRig } from './player/PlayerRig';
import { TourRig } from './player/TourRig';
import { WorldRoadLayer } from './roads/WorldRoadLayer';
import { WorldWaterPlane } from './environment/WorldWaterPlane';
import { LIGHTING_PRESETS } from './environment/lightingPresets';
import { useWorldExplorationStore } from './state/worldExplorationStore';

/**
 * Phase T1 illustrative scene root, extended in Phase T3 with interactive Walk/Fly/Tour
 * exploration (`reports/tourism-digital-twin/`). Same graphics-quality decision function as the
 * existing 3D view (`AdministrativeMap.tsx`) — decided once per mount from cheap device signals,
 * never reactive, see `graphicsQuality.ts`.
 *
 * The original one-shot fly-in intro (`WorldFlyInCamera`) is kept exactly as Phase T1 shipped it
 * — not replaced — and hands off to the interactive `PlayerRig`/`TourRig` once it settles
 * (immediately, with `reducedMotion`), so a first-time visitor's first impression of the scene is
 * unchanged. `PlayerRig`'s initial pose approximates where the intro settles (see its own doc
 * comment) so the handoff reads as a continuation, not a jump.
 */
export function WorldScene({ reducedMotion }: { reducedMotion: boolean }) {
  const graphicsQuality = getGraphicsQualityConfigForCurrentDevice();
  const [introSettled, setIntroSettled] = useState(reducedMotion);
  // Phase T4 — illustrative lighting preset (`environment/lightingPresets.ts`); default `'day'`
  // reproduces this scene's original fixed lighting exactly, see that module's doc comment.
  const lightingPreset = useWorldExplorationStore((state) => state.lightingPreset);
  const preset = LIGHTING_PRESETS[lightingPreset];

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setIntroSettled(true), FLY_IN_DURATION_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  return (
    <Suspense fallback={<MapLoading />}>
      <Canvas
        dpr={[1, graphicsQuality.maxDevicePixelRatio]}
        gl={{ antialias: graphicsQuality.antialias, powerPreference: 'high-performance' }}
        shadows={false}
      >
        <color attach="background" args={[preset.backgroundColor]} />
        <fog attach="fog" args={[preset.fogColor, preset.fogNear, preset.fogFar]} />
        <hemisphereLight
          args={[preset.hemisphereSky, preset.hemisphereGround, preset.hemisphereIntensity]}
        />
        <directionalLight
          position={preset.directionalPosition}
          intensity={preset.directionalIntensity}
          color={preset.directionalColor}
        />
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <WorldTerrainMesh />
          <WorldRoadLayer />
          <WorldBuildingsLayer />
          <WorldWaterPlane />
          <WorldDestinationMarkers />
        </group>
        {introSettled ? (
          <>
            {/* Same fov as WorldFlyInCamera.tsx's intro camera — matching it here avoids a jarring
                zoom-jump the instant the handoff happens (PlayerRig.tsx's initial pose already
                matches the intro's settled position/orientation exactly, see its own doc
                comment). */}
            <PerspectiveCamera makeDefault fov={45} near={0.05} far={100} />
            <PlayerRig />
            <TourRig />
          </>
        ) : (
          <WorldFlyInCamera reducedMotion={reducedMotion} />
        )}
      </Canvas>
    </Suspense>
  );
}
