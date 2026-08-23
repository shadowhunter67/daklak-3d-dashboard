import { create } from 'zustand';

/**
 * World-exploration's OWN store — deliberately not `useMapStore` (`src/stores/mapStore.ts`).
 * Every existing world-exploration file that touches state documents the same isolation
 * rationale (see `WorldTerrainMesh.tsx`, `WorldDestinationMarkers.tsx`): this scene must not read
 * or mutate state the other four dashboard views' camera/selection logic reacts to, and vice
 * versa. Player pose changes up to 60x/second — coupling that into the shared dashboard store
 * would also be a real performance hazard for every other view's subscribers.
 *
 * Performance note: `pose` here is a *throttled* snapshot for HUD display (coordinates/altitude),
 * not the per-frame source of truth — `PlayerRig.tsx` keeps the authoritative, continuously
 * -updated pose in a local ref/Three.js object and only commits a throttled snapshot here (see
 * its own doc comment). Do not read `pose` from a render-loop callback.
 */

export type WorldExplorationMode = 'walk' | 'fly' | 'tour';

export interface WorldPose {
  x: number;
  y: number;
  z: number;
  /** Radians, 0 = facing world -Z (Three.js default camera forward), increases counter-clockwise
   * viewed from above — same convention `PlayerRig.tsx` uses for mouse-look yaw. */
  yaw: number;
}

export interface TeleportRequest {
  x: number;
  z: number;
  /** Optional facing to apply on arrival (e.g. "face the POI"); omitted keeps current yaw. */
  yaw?: number;
  requestId: number;
}

// Matches `PlayerRig.tsx`'s initial `bodyRef` exactly (WorldFlyInCamera.tsx's settled intro
// framing) — see that file's doc comment for the derivation.
const INITIAL_POSE: WorldPose = { x: 0, y: 2.4, z: 5.2, yaw: 0 };

export interface WorldExplorationState {
  mode: WorldExplorationMode;
  pose: WorldPose;
  terrainReady: boolean;
  pointerLocked: boolean;
  selectedPoiId: string | null;
  nearestPoiId: string | null;
  nearestPoiDistance: number | null;
  poiListOpen: boolean;
  teleportMenuOpen: boolean;
  onboardingOpen: boolean;
  activeTourId: string | null;
  tourStopIndex: number;
  tourPlaying: boolean;
  teleportRequest: TeleportRequest | null;
  reducedMotion: boolean;

  setMode: (mode: WorldExplorationMode) => void;
  setPose: (pose: WorldPose) => void;
  setTerrainReady: (ready: boolean) => void;
  setPointerLocked: (locked: boolean) => void;
  selectPoi: (id: string | null) => void;
  setNearestPoi: (id: string | null, distance: number | null) => void;
  setPoiListOpen: (open: boolean) => void;
  setTeleportMenuOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  requestTeleport: (target: { x: number; z: number; yaw?: number }) => void;
  startTour: (tourId: string) => void;
  pauseTour: () => void;
  resumeTour: () => void;
  stopTour: () => void;
  setTourStopIndex: (index: number) => void;
  setReducedMotion: (reduced: boolean) => void;
}

let teleportRequestCounter = 0;

export function createWorldExplorationStore() {
  return create<WorldExplorationState>((set) => ({
    mode: 'fly',
    pose: INITIAL_POSE,
    terrainReady: false,
    pointerLocked: false,
    selectedPoiId: null,
    nearestPoiId: null,
    nearestPoiDistance: null,
    poiListOpen: false,
    teleportMenuOpen: false,
    onboardingOpen: false,
    activeTourId: null,
    tourStopIndex: 0,
    tourPlaying: false,
    teleportRequest: null,
    reducedMotion: false,

    setMode: (mode) =>
      set((state) => ({
        mode,
        // Leaving 'tour' pauses it rather than silently keeping it "playing" off-screen state;
        // re-entering via startTour() always begins a fresh, explicit choice.
        tourPlaying: mode === 'tour' ? state.tourPlaying : false,
      })),
    setPose: (pose) => set({ pose }),
    setTerrainReady: (terrainReady) => set({ terrainReady }),
    setPointerLocked: (pointerLocked) => set({ pointerLocked }),
    selectPoi: (selectedPoiId) => set({ selectedPoiId }),
    setNearestPoi: (nearestPoiId, nearestPoiDistance) => set({ nearestPoiId, nearestPoiDistance }),
    setPoiListOpen: (poiListOpen) => set({ poiListOpen }),
    setTeleportMenuOpen: (teleportMenuOpen) => set({ teleportMenuOpen }),
    setOnboardingOpen: (onboardingOpen) => set({ onboardingOpen }),
    requestTeleport: ({ x, z, yaw }) =>
      set({ teleportRequest: { x, z, yaw, requestId: ++teleportRequestCounter } }),
    startTour: (activeTourId) =>
      set({ mode: 'tour', activeTourId, tourStopIndex: 0, tourPlaying: true }),
    pauseTour: () => set({ tourPlaying: false }),
    resumeTour: () => set((state) => ({ tourPlaying: state.activeTourId !== null })),
    stopTour: () => set({ activeTourId: null, tourPlaying: false, tourStopIndex: 0 }),
    setTourStopIndex: (tourStopIndex) => set({ tourStopIndex }),
    setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  }));
}

export const useWorldExplorationStore = createWorldExplorationStore();
