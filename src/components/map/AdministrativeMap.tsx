import { ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { CameraControls } from './CameraControls';
import { MapAnnotations } from './MapAnnotations';
import { TerrainSurface } from './TerrainSurface';
import { HeatmapOverlay, SelectionOverlay } from './TerrainOverlays';
import { MapErrorBoundary, MapFallback, MapLoading } from './MapFallback';

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function MapContent() {
  const dataMode = useMapStore((state) => state.dataMode);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <TerrainSurface />
      <SelectionOverlay />
      {dataMode === 'heatmap' && <HeatmapOverlay />}
      <MapAnnotations />
    </group>
  );
}

export function AdministrativeMap() {
  const [contextLost, setContextLost] = useState(false);
  if (!supportsWebGL()) {
    return <MapFallback reason="Trình duyệt hoặc thiết bị này không hỗ trợ WebGL." />;
  }
  return (
    <MapErrorBoundary>
      <div className="map-canvas-shell">
        <Suspense fallback={<MapLoading />}>
          <Canvas
            dpr={[1, 1.35]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                setContextLost(true);
              });
              gl.domElement.addEventListener('webglcontextrestored', () => setContextLost(false));
            }}
            orthographic
            camera={{ position: [0, 8.2, 15.5], zoom: 246, near: 0.1, far: 100 }}
            onPointerMissed={() => useMapStore.getState().select(null)}
          >
            <color attach="background" args={['#071918']} />
            <hemisphereLight args={['#b9f0dd', '#031b19', 1.35]} />
            <directionalLight position={[-6, 9, 7]} intensity={3.8} color="#fff0c2" />
            <gridHelper args={[18, 36, '#315e57', '#143633']} position={[0, -0.055, 0]} />
            <MapContent />
            <ContactShadows
              position={[0, -0.045, 0]}
              opacity={0.32}
              scale={12}
              blur={2.6}
              far={4}
              resolution={256}
              color="#000d0c"
            />
            <CameraControls />
          </Canvas>
        </Suspense>
        {contextLost && <MapFallback reason="Kết nối với bộ xử lý đồ họa đã bị mất." />}
      </div>
    </MapErrorBoundary>
  );
}
