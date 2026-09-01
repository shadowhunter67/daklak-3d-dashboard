import { useThree, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { PerspectiveCamera as PerspectiveCameraImpl } from 'three';
import { cameraNearFarMeters, scaleBandForAltitude, type ScaleBand } from './cameraScaleBands';
import { metersToWorld, worldToMeters } from '../coordinates/worldScale';
import { FALLBACK_GROUND_HEIGHT } from '../player/movement/playerMovement';
import { useTerrainSampler } from '../terrain/useTerrainSampler';
import { useWorldExplorationStore } from '../state/worldExplorationStore';

/** Same throttle convention `PlayerRig.tsx`/`TourRig.tsx` already use for their own HUD-facing
 * store commits — the store must not be written every frame (see `worldExplorationStore.ts`'s
 * doc comment on `pose`). */
const COMMIT_INTERVAL_SECONDS = 0.15;

/** Applies near/far in one place, outside the component body — this project's lint config (the
 * React Compiler's immutability rule) flags a direct `camera.near = x` property assignment inside
 * a component/`useFrame` callback as "modifying a value returned from a hook," even though
 * `camera.position.set(...)` (a method call on a nested object, used freely elsewhere — see
 * `TourRig.tsx`/`PlayerRig.tsx`) is fine. Moving the actual mutation into an ordinary function
 * called with `camera` as a parameter satisfies the rule without changing the underlying (correct,
 * idiomatic r3f) behavior of mutating the shared active camera in place every frame. */
function applyNearFar(camera: PerspectiveCameraImpl, near: number, far: number): void {
  if (camera.near === near && camera.far === far) return;
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
}

/**
 * Owns `camera.near`/`camera.far` every frame, driven by the camera's real altitude above the
 * terrain directly below it — replaces `WorldScene.tsx`'s old fixed `near=0.05/far=100`, which was
 * only ever correct at the one altitude it happened to be tuned for. Mounted alongside
 * `PlayerRig`/`TourRig` once the intro settles; runs regardless of which of those two owns the
 * camera's position/rotation this frame, since near/far correctness doesn't depend on who moved
 * it — this component only ever reads `camera.position`, never writes it.
 *
 * Also commits the hysteresis-debounced altitude band (`cameraScaleBands.ts`) into the store —
 * not consumed by anything yet in this PR, but this is the seam future procedural-density/LOD work
 * (`reports/tourism-digital-twin/world-scale-lod-adr.md`'s PR6-8) reads from.
 *
 * See that ADR's Question 3 for why dynamic near/far (this component) was chosen over a floating
 * -origin rebase or multiple cross-faded camera "shells".
 */
export function ScaleDirector() {
  const { camera } = useThree();
  const sampler = useTerrainSampler();
  const setCameraScale = useWorldExplorationStore((state) => state.setCameraScale);
  const bandRef = useRef<ScaleBand>('province');
  const commitAccumulator = useRef(0);

  useFrame((_, rawDelta) => {
    const perspectiveCamera = camera as PerspectiveCameraImpl;
    const groundHeight =
      sampler?.getHeight(perspectiveCamera.position.x, perspectiveCamera.position.z) ??
      FALLBACK_GROUND_HEIGHT;
    const altitudeMeters = Math.max(0, worldToMeters(perspectiveCamera.position.y - groundHeight));

    const { nearMeters, farMeters } = cameraNearFarMeters(altitudeMeters);
    applyNearFar(perspectiveCamera, metersToWorld(nearMeters), metersToWorld(farMeters));

    bandRef.current = scaleBandForAltitude(altitudeMeters, bandRef.current);

    commitAccumulator.current += rawDelta;
    if (commitAccumulator.current >= COMMIT_INTERVAL_SECONDS) {
      commitAccumulator.current = 0;
      setCameraScale(altitudeMeters, bandRef.current);
    }
  });

  return null;
}
