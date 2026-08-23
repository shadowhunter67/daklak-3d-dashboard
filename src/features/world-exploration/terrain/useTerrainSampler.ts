import { useEffect, useState } from 'react';
import { loadTerrainHeightSampler, type TerrainSampler } from './terrainHeightSampler';
import { useWorldExplorationStore } from '../state/worldExplorationStore';

/**
 * The one hook every ground-anchored world-exploration object uses to get the shared CPU terrain
 * sampler (`PlayerRig.tsx`, `TourRig.tsx`, `WorldDestinationMarkers.tsx`) — never call
 * `loadTerrainHeightSampler()` directly from a component. `loadTerrainHeightSampler` itself
 * already caches the decode (one fetch/canvas-decode total, however many consumers), this hook
 * just adapts that shared promise into per-component React state, plus mirrors "loaded" into
 * `worldExplorationStore`'s `terrainReady` once, from whichever consumer mounts/resolves first.
 */
export function useTerrainSampler(): TerrainSampler | null {
  const [sampler, setSampler] = useState<TerrainSampler | null>(null);
  const setTerrainReady = useWorldExplorationStore((state) => state.setTerrainReady);

  useEffect(() => {
    let cancelled = false;
    loadTerrainHeightSampler()
      .then((resolved) => {
        if (cancelled) return;
        setSampler(resolved);
        setTerrainReady(true);
      })
      .catch(() => {
        // Non-fatal — callers fall back to a flat-ground default (see `FALLBACK_GROUND_HEIGHT`
        // in `playerMovement.ts`); `terrainReady` simply never flips true in this case.
      });
    return () => {
      cancelled = true;
    };
  }, [setTerrainReady]);

  return sampler;
}
