import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { getGraphicsQualityConfigForCurrentDevice } from '../../utils/graphicsQuality';
import { MapLoading } from '../../components/map/MapFallback';
import { WorldDestinationMarkers } from './WorldDestinationMarkers';
import { WorldFlyInCamera } from './WorldFlyInCamera';
import { WorldTerrainMesh } from './WorldTerrainMesh';

/**
 * Phase T1 illustrative scene root. Same graphics-quality decision function as the existing 3D
 * view (`AdministrativeMap.tsx`) — decided once per mount from cheap device signals, never
 * reactive, see `graphicsQuality.ts`.
 */
export function WorldScene({ reducedMotion }: { reducedMotion: boolean }) {
  const graphicsQuality = getGraphicsQualityConfigForCurrentDevice();
  return (
    <Suspense fallback={<MapLoading />}>
      <Canvas
        dpr={[1, graphicsQuality.maxDevicePixelRatio]}
        gl={{ antialias: graphicsQuality.antialias, powerPreference: 'high-performance' }}
        shadows={false}
      >
        <color attach="background" args={['#04110f']} />
        <hemisphereLight args={['#b9f0dd', '#031b19', 1.35]} />
        <directionalLight position={[-6, 9, 7]} intensity={3.4} color="#fff0c2" />
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <WorldTerrainMesh />
          <WorldDestinationMarkers />
        </group>
        <WorldFlyInCamera reducedMotion={reducedMotion} />
      </Canvas>
    </Suspense>
  );
}
