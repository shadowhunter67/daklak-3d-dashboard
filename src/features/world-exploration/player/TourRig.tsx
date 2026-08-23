import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { FALLBACK_GROUND_HEIGHT } from './movement/playerMovement';
import { useTerrainSampler } from '../terrain/useTerrainSampler';
import { useWorldExplorationStore } from '../state/worldExplorationStore';
import { getWorldTourById } from '../tours/worldTours';
import {
  advanceTourProgress,
  createInitialTourProgress,
  getTourStops,
  tourPositionForProgress,
  type TourProgress,
} from '../tours/tourEngine';

/** Aerial vantage height above the terrain surface while a tour camera holds/travels between
 * stops — high enough to see the destination and its surroundings, not a ground-level walk. */
const TOUR_CAMERA_HEIGHT = 1.3;
const HUD_COMMIT_INTERVAL_SECONDS = 0.15;
const MAX_FRAME_DELTA_SECONDS = 0.1;

/**
 * Owns the camera exclusively while `mode === 'tour'` (`PlayerRig.tsx`'s own `useFrame` early
 * -returns in that case — the two rigs never fight over the camera in the same frame). Advances
 * `tourEngine.ts`'s pure playback state, places the camera, and mirrors the current stop into
 * `selectedPoiId` so the same `WorldPoiPanel` Walk/Fly mode already uses for "nearby POI" doubles
 * as the tour's stop-info display — no separate tour-only info panel component needed.
 */
export function TourRig() {
  const { camera } = useThree();
  const mode = useWorldExplorationStore((state) => state.mode);
  const activeTourId = useWorldExplorationStore((state) => state.activeTourId);
  const tourPlaying = useWorldExplorationStore((state) => state.tourPlaying);
  const reducedMotion = useWorldExplorationStore((state) => state.reducedMotion);
  const setTourStopIndex = useWorldExplorationStore((state) => state.setTourStopIndex);
  const selectPoi = useWorldExplorationStore((state) => state.selectPoi);
  const stopTour = useWorldExplorationStore((state) => state.stopTour);
  const setPose = useWorldExplorationStore((state) => state.setPose);
  const sampler = useTerrainSampler();

  const tour = activeTourId ? getWorldTourById(activeTourId) : undefined;
  const stops = useMemo(() => (tour ? getTourStops(tour) : []), [tour]);

  const progressRef = useRef<TourProgress>(createInitialTourProgress());
  const startedTourId = useRef<string | null>(null);
  const hudCommitAccumulator = useRef(0);

  // A fresh tour (new id) always restarts playback from the first stop, even if the previous
  // tour was mid-flight — `startTour()` in the store already resets `tourStopIndex`, this keeps
  // the local playback progress in lockstep with that reset.
  useEffect(() => {
    if (activeTourId !== startedTourId.current) {
      startedTourId.current = activeTourId;
      progressRef.current = createInitialTourProgress();
    }
  }, [activeTourId]);

  useFrame((_, rawDelta) => {
    if (mode !== 'tour' || !tourPlaying || stops.length === 0) return;
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA_SECONDS);

    const previous = progressRef.current;
    const next = advanceTourProgress(previous, delta, stops, reducedMotion);
    progressRef.current = next;

    if (next.phase === 'finished') {
      if (previous.phase !== 'finished') stopTour();
      return;
    }

    if (next.fromIndex !== previous.fromIndex || next.phase !== previous.phase) {
      const stopIndex = Math.min(next.fromIndex, stops.length - 1);
      setTourStopIndex(stopIndex);
      // Show the POI panel only once settled at a stop, not mid-flight between two of them.
      selectPoi(next.phase === 'dwelling' ? (stops[stopIndex]?.id ?? null) : null);
    }

    const xz = tourPositionForProgress(stops, next);
    const groundHeight = sampler?.getHeight(xz.x, xz.z) ?? FALLBACK_GROUND_HEIGHT;
    const cameraY = groundHeight + TOUR_CAMERA_HEIGHT;
    camera.position.set(xz.x, cameraY, xz.z);

    const lookIndex = Math.min(next.fromIndex + 1, stops.length - 1);
    const lookTarget = stops[lookIndex]?.world ?? xz;
    camera.lookAt(lookTarget.x, cameraY - 0.35, lookTarget.z);

    hudCommitAccumulator.current += rawDelta;
    if (hudCommitAccumulator.current >= HUD_COMMIT_INTERVAL_SECONDS) {
      hudCommitAccumulator.current = 0;
      setPose({ x: xz.x, y: cameraY, z: xz.z, yaw: camera.rotation.y });
    }
  });

  return null;
}
