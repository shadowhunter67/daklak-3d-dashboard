import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { PerspectiveCamera as PerspectiveCameraImpl } from 'three';

/** Also read by `WorldScene.tsx` to know when to hand off from this one-shot intro to the
 * interactive `PlayerRig`/`TourRig` (Walk/Fly/Tour, Phase T3) — kept as the single source of
 * truth for the intro's length rather than a second hardcoded duration. */
export const FLY_IN_DURATION_SECONDS = 2.4;
const START_RADIUS = 9.5;
const END_RADIUS = 5.2;
const START_HEIGHT = 6.5;
const END_HEIGHT = 2.4;
const ORBIT_SPEED_RAD_PER_SEC = 0.12;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Phase T1 illustrative camera: a one-shot fly-in over the reused terrain mesh, then a slow
 * orbit. When `reducedMotion` is true, skips straight to the settled end position with no
 * animation at all — same policy the existing 3D view already applies to `autoRotate` (see
 * `graphicsQuality.ts`'s doc comment and `mapStore.ts`'s `setReducedMotion`). Mouse
 * orbit/zoom via `OrbitControls` stays available either way — only the automatic fly-in/orbit
 * animation is gated on `reducedMotion`.
 */
export function WorldFlyInCamera({ reducedMotion }: { reducedMotion: boolean }) {
  const elapsed = useRef(reducedMotion ? FLY_IN_DURATION_SECONDS : 0);
  const angle = useRef(0);
  const cameraRef = useRef<PerspectiveCameraImpl | null>(null);

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (!reducedMotion && elapsed.current < FLY_IN_DURATION_SECONDS) {
      elapsed.current = Math.min(FLY_IN_DURATION_SECONDS, elapsed.current + delta);
    }
    const t = easeOutCubic(elapsed.current / FLY_IN_DURATION_SECONDS);
    const radius = START_RADIUS + (END_RADIUS - START_RADIUS) * t;
    const height = START_HEIGHT + (END_HEIGHT - START_HEIGHT) * t;

    if (!reducedMotion && elapsed.current >= FLY_IN_DURATION_SECONDS) {
      angle.current += ORBIT_SPEED_RAD_PER_SEC * delta;
    }

    camera.position.set(radius * Math.sin(angle.current), height, radius * Math.cos(angle.current));
    camera.lookAt(0, 0.3, 0);
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={45} near={0.1} far={100} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2.5}
        maxDistance={12}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0.3, 0]}
      />
    </>
  );
}
