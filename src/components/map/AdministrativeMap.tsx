import { ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { CameraControls } from './CameraControls';
import { MapAnnotations } from './MapAnnotations';
import { TerrainSurface } from './TerrainSurface';
import { HeatmapOverlay, SelectionOverlay } from './TerrainOverlays';
import { MapErrorBoundary, MapFallback, MapLoading } from './MapFallback';
import { RoadLayer3D } from './RoadLayer3D';
import { subscribeWebGLContext } from './webglLifecycle';
import { getGraphicsQualityConfigForCurrentDevice } from '../../utils/graphicsQuality';

function WebGLContextMonitor({
  onLost,
  onRestored,
}: {
  onLost: () => void;
  onRestored: () => void;
}) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(
    () => subscribeWebGLContext(canvas, { onLost, onRestored }),
    [canvas, onLost, onRestored],
  );
  return null;
}

function MapContent() {
  const dataMode = useMapStore((state) => state.dataMode);
  const roadsVisible = useMapStore((state) => state.roadsVisible);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <TerrainSurface />
      <SelectionOverlay />
      {dataMode === 'heatmap' && <HeatmapOverlay />}
      <MapAnnotations />
      {roadsVisible && <RoadLayer3D />}
    </group>
  );
}

// WebGL support is decided once, by MapViewport, before this component is lazy-loaded and
// mounted at all — checking again here would just duplicate that decision (see AGENTS.md:
// avoid duplicating a single-source-of-truth decision without a concrete technical reason).
export function AdministrativeMap() {
  const [contextLost, setContextLost] = useState(false);
  const [canvasGeneration, setCanvasGeneration] = useState(0);
  // Decided once from cheap device signals (no benchmarking, no telemetry) and never
  // recomputed reactively, so it can never itself trigger a Canvas remount.
  const [graphicsQuality] = useState(() => getGraphicsQualityConfigForCurrentDevice());
  const handleContextLost = useCallback(() => setContextLost(true), []);
  const handleContextRestored = useCallback(() => setContextLost(false), []);
  return (
    <MapErrorBoundary>
      <div className="map-canvas-shell">
        <Suspense fallback={<MapLoading />}>
          <Canvas
            key={canvasGeneration}
            dpr={[1, graphicsQuality.maxDevicePixelRatio]}
            gl={{ antialias: graphicsQuality.antialias, powerPreference: 'high-performance' }}
            orthographic
            camera={{ position: [0, 8.2, 15.5], zoom: 246, near: 0.1, far: 100 }}
            onPointerMissed={() => useMapStore.getState().select(null)}
          >
            <color attach="background" args={['#071918']} />
            <WebGLContextMonitor onLost={handleContextLost} onRestored={handleContextRestored} />
            <hemisphereLight args={['#b9f0dd', '#031b19', 1.35]} />
            <directionalLight position={[-6, 9, 7]} intensity={3.8} color="#fff0c2" />
            <gridHelper args={[18, 36, '#315e57', '#143633']} position={[0, -0.055, 0]} />
            <MapContent />
            {graphicsQuality.contactShadows && (
              <ContactShadows
                position={[0, -0.045, 0]}
                opacity={0.32}
                scale={12}
                blur={2.6}
                far={4}
                resolution={256}
                color="#000d0c"
              />
            )}
            <CameraControls />
          </Canvas>
        </Suspense>
        {contextLost && (
          <MapFallback
            reason="Kết nối với bộ xử lý đồ họa đã bị mất. Bạn có thể thử khởi tạo lại riêng bản đồ."
            actionLabel="Tải lại bản đồ"
            onRetry={() => {
              setContextLost(false);
              setCanvasGeneration((value) => value + 1);
            }}
          />
        )}
      </div>
    </MapErrorBoundary>
  );
}
