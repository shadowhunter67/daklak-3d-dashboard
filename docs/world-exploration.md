# World Exploration (`?view=world`)

Technical reference for the "Khám phá Đắk Lắk 3D" route across its four phases:

- **Phase T1** — illustrative fly-in intro over the real terrain mesh (`WorldFlyInCamera.tsx`, `WorldTerrainMesh.tsx`).
- **Phase T2** — 4 real, sourced tourism destinations (`src/entities/tourism/`), rendered as clickable markers (`WorldDestinationMarkers.tsx`).
- **Phase T3** — interactive Walk/Fly/Tour exploration: a CPU-side terrain sampler, a first-person player controller, POI proximity/interaction, teleport, guided tours, and a DOM-level HUD.
- **Phase T4** (this document's latest additions) — ground-anchored destination markers, illustrative lighting presets, the reused road-layer data, and a 5th verified destination (`krong-kmar-waterfall`).

See `reports/tourism-digital-twin/` for the phase-by-phase build history, decisions, and verification evidence. This document is the standing architecture reference; that directory is the dated log.

## Architecture

```
WorldExplorationView.tsx        <section id="world-viewport">, WebGL fallback, mounts WorldScene + WorldHud
├── WorldScene.tsx               <Canvas>: lights, terrain group, camera (intro -> PlayerRig/TourRig handoff)
│   ├── WorldTerrainMesh.tsx      reused terrain textures (Phase T1, unchanged)
│   ├── roads/WorldRoadLayer.tsx  Phase T4 — reused road-layer data, ground-anchored (new)
│   ├── environment/WorldWaterPlane.tsx  Phase T4 — illustrative water disc at Hồ Lắk (new)
│   ├── WorldDestinationMarkers   Phase T2 markers + in-canvas info panel; Phase T4 ground-anchors
│   │                             each marker's Y to real elevation (poi/destinationElevation.ts)
│   ├── WorldFlyInCamera.tsx      one-shot intro (Phase T1, unchanged) — owns the camera until settled
│   ├── player/PlayerRig.tsx      owns the camera for Walk/Fly — input, movement, camera, teleport
│   └── player/TourRig.tsx        owns the camera for Tour — tour playback, camera framing
├── hud/WorldHud.tsx              DOM overlay: mode switch, status bar, dialogs, touch controls
│   └── hud/WorldEnvironmentControls.tsx  Phase T4 — dawn/day/sunset lighting preset buttons (new)
├── environment/lightingPresets.ts  Phase T4 — illustrative lighting mood definitions (new)
├── state/worldExplorationStore.ts  Zustand store, isolated from useMapStore (see below)
├── terrain/terrainHeightSampler.ts CPU-side elevation query (built Phase T3, reused by Phase T4)
├── poi/worldPoi.ts               runtime adapter over Phase T2/T4's TourismDestination[]
├── poi/destinationElevation.ts   Phase T4 — marker ground-anchoring height lookup (new)
├── roads/worldRoadPoint.ts       Phase T4 — ground-anchored road-vertex projector (new)
├── tours/{worldTours,tourEngine}.ts data-driven guided tours
└── coordinates/worldCoordinates.ts single shared lon/lat <-> world-space conversion
```

**State isolation.** Every prior phase document already establishes this and Phase T3 keeps it: nothing here reads or writes `useMapStore` (the other four views' Zustand store). `worldExplorationStore.ts` is this feature's own store. The only cross-store touch is one-way: `WorldExplorationView.tsx` mirrors `useMapStore`'s `reducedMotion` into `worldExplorationStore`'s own `reducedMotion` field on mount, so `tourEngine.ts`/`TourRig.tsx` never import `useMapStore` directly.

**Intro -> interactive handoff.** `WorldScene.tsx` still mounts `WorldFlyInCamera` first, unmodified. Once it settles (immediately if `prefers-reduced-motion: reduce`, after ~2.4s otherwise), `WorldScene` swaps in a plain `<PerspectiveCamera>` and mounts `PlayerRig`. `PlayerRig`'s initial pose is not an approximation — it is the _exact_ position/orientation `WorldFlyInCamera` settles at (`(0, 2.4, 5.2)` looking at `(0, 0.3, 0)`, decomposed into yaw/pitch via a real `THREE.PerspectiveCamera.lookAt()` call, not hand-derived trig — see `PlayerRig.tsx`'s doc comment), so the handoff is a continuation, not a jump. `TourRig.tsx` takes over the same camera only while `mode === 'tour'`; the two rigs never fight over it in the same frame.

## Coordinate system

Everything in this scene shares one conversion, in `coordinates/worldCoordinates.ts`:

- `latLonToWorld(lon, lat) -> {x, z}` and its inverse `worldToLatLon(x, z) -> [lon, lat]`, built on the app's existing `projection()` (`src/utils/geo.ts`, a `d3-geo` Mercator projection already used by the terrain/borders pipeline — no new projection, no new library).
- Derivation (verified against the scene graph, not assumed): `WorldScene.tsx` wraps all scene content in `<group rotation={[-Math.PI / 2, 0, 0]}>`. Rotating a point by -90° about X maps `(x, y, z) -> (x, z, -y)`. Phase T2's markers already establish that a point placed directly in that group at local `(point[0], -point[1], z)` lands, after rotation, at world `(point[0], z, point[1])` — so for _any_ point in this scene, `worldX = mercatorX`, `worldZ = mercatorY`, independent of the terrain mesh's own `position` offset (an unrelated authoring detail of how its geometry vertices were generated — see `terrainConfig.ts`).
- `getWorldBounds()` derives the real terrain data's world-space extent directly from `daklak-terrain-metadata.json`'s bbox corners (not from the terrain mesh's `position`/`width`/`height`, which live in a different, pre-rotation local-vertex space).
- `haversineDistanceMeters(a, b)` — a real geographic distance (meters), used for HUD/POI-list "how far" display. Deliberately **not** derived from the Mercator-projected `worldDistance()` (used only for in-scene proximity thresholds, e.g. `POI_PROXIMITY_RADIUS`): `projection()` is not equidistant, so a "world units" number would not be an honest meters figure at any but the smallest scales.

Unit tests: `coordinates/worldCoordinates.test.ts` (round-trips every real POI's lon/lat through world-space and back, checks the province bbox corners project to the reported bounds, sanity-checks `haversineDistanceMeters` against the well-known ~111.2 km/degree-of-latitude constant).

## Terrain sampler (CPU-side elevation query)

`reports/tourism-digital-twin/world-engine-adr.md` flagged this as the one genuine gap in the existing pipeline: elevation lived only in a GPU displacement map, sampled in the vertex shader, with no CPU-side "what's the ground height here" query anywhere in the codebase.

**Design.** `terrain/terrainHeightSampler.ts` decodes the _same_ PNG the GPU displaces with (`daklak-terrain-height.png`, already shipped) via the browser's native `<canvas>` 2D API — `fetch` -> `createImageBitmap` -> `drawImage` -> `getImageData`, once, cached at module scope (the same "cache the in-flight/resolved promise" pattern `I18nProvider.tsx` already uses for its English dictionary). No new dependency, no new build-time asset pipeline step, and — critically — no risk of a separately-regenerated copy silently drifting from what the GPU is actually displaying, since it's the literal same file.

```ts
interface TerrainSampler {
  getHeight(worldX: number, worldZ: number): number | null; // world-space Y (scene units)
  getElevationMeters(worldX: number, worldZ: number): number | null; // real meters, HUD display only
}
```

**Row/column <-> geography mapping**, cross-checked two independent ways (both documented in `terrainHeightSampler.ts`'s own comment, and both asserted by tests):

1. `scripts/generate_daklak_terrain.py`'s `lonlat_to_pixel`/crop logic: PNG row 0 = north edge (max latitude), row _(height-1)_ = south edge.
2. `worldCoordinates.ts`'s independent scene-graph derivation: `worldZ = mercatorY`, and Mercator Y is smaller for higher latitude — so `getWorldBounds().minZ` is always north, `maxZ` always south, for the same underlying reason.

**Bilinear sampling** (`terrain/terrainGrid.ts`) is a small, pure, dependency-free function operating on a generic `{width, height, data}` grid — unit-tested with hand-checkable synthetic grids (`terrainGrid.test.ts`: exact corner values, an exact-center bilinear average, a linear-ramp axis, boundary/degenerate-input handling), independent of any real image decode.

**Elevation reconstruction.** `daklak-terrain-metadata.json`'s `elevationMinMeters`/`elevationMaxMeters` are the exact percentile-clip bounds the generation script used to normalize raw SRTM meters into the PNG's 0-255 grayscale — `getElevationMeters` reconstructs `elevationMinMeters + normalized * (max - min)`, reading the _blurred, saved_ PNG (matching what's actually rendered, not a hypothetical unblurred value).

**Testing the decode itself.** `jsdom` (this repo's vitest environment) has no real `<canvas>` 2D rendering and no `createImageBitmap` — adding a real decoder (`canvas` npm package) would be a new dependency. `terrainHeightSampler.test.ts` instead mocks exactly those two browser primitives with a small, fully-controlled synthetic 2x2 image, so the _real_ wiring under test (fetch -> decode -> row/column mapping -> displacement formula -> caching/retry-after-failure) runs for real; only the PNG bytes are faked. The real shipped PNG is exercised end-to-end by `e2e/world-exploration.spec.ts`'s Walk-mode assertions (real Chromium, real decode).

**Shared by everything ground-anchored.** `terrain/useTerrainSampler.ts` is the one hook `PlayerRig.tsx`, `TourRig.tsx`, and (as of Phase T4) `WorldDestinationMarkers.tsx`/`roads/WorldRoadLayer.tsx` use to get the sampler — never a second ad hoc loader. Phase T2/T3 kept destination markers at a fixed flat height because ground-anchoring them once broke `WorldFlyInCamera.tsx`'s fixed intro framing for some real destinations (see `WorldDestinationMarkers.tsx`'s doc comment); Phase T4 ground-anchors the _marker_ position via `poi/destinationElevation.ts` without touching the camera at all, accepting that a marker can legitimately sit outside the intro's fixed frame at its real elevation (the non-canvas `WorldPoiList.tsx` and Walk/Fly/Tour modes remain the accessible path regardless).

## Player controller

`player/` is split by concern, not one large component:

- `input/useKeyboardControls.ts` — WASD/arrows/Shift/Space held-state in a plain ref (not React state — read up to 60x/second by `useFrame`, would be wasted re-renders as state), plus one-shot `E`/`Escape` callbacks.
- `input/usePointerLook.ts` — Pointer Lock API mouse-look, accumulated deltas drained once per frame.
- `input/touchInputBridge.ts` — the cross-boundary channel `WorldTouchControls.tsx` (a plain DOM overlay, sibling of `<Canvas>`, not inside it) uses to feed a joystick vector, look-drag deltas, and an interact request into `PlayerRig.tsx`.
- `movement/playerMovement.ts` — pure functions (`computeWalkMovement`, `computeFlyMovement`, `updateLookAngles`), no Three.js/DOM types. Every quantity is `speed * deltaSeconds`, so movement is frame-rate independent by construction — verified directly in `playerMovement.test.ts` (two half-steps cover the same distance as one full step).
- `PlayerRig.tsx` / `TourRig.tsx` — the only two files that touch `useFrame`/the camera.

**Walk mode.** Horizontal movement is rotated by the current yaw, then the terrain sampler is queried at the _new_ position each frame — the player's Y simply follows that (smoothly bilinear-interpolated) height field continuously while grounded, which is also how slopes are handled: no separate slope-limiting logic exists or is needed, because a bilinear height field has no discontinuities to limit. Vertical motion is a simple projectile (gravity integrates every airborne frame; jump applies one upward impulse), and landing snaps exactly to the sampled ground height rather than letting float accumulation drift below it — `playerMovement.test.ts` simulates ~2 seconds of falling in 10ms steps and asserts `y` never goes negative.

**Fly mode.** Full 3D movement in the look direction (pitch affects vertical speed — looking up while moving forward climbs), plus explicit vertical keys (`Space` up, `Shift` down), clamped to stay within a small margin of `getWorldBounds()` and a sane altitude range. No gravity, no ground snapping.

**No physics engine.** Height-based ground-snapping plus simple projectile gravity is sufficient for this scope (a single walking player on a smooth heightfield, no other dynamic bodies, no complex collision geometry) — adding a physics library (Cannon/Rapier/etc.) would be a real new dependency for a problem this project doesn't have. Revisit only if a future phase needs body-to-body collision, ragdolls, or vehicle physics.

**Look convention.** `yaw = 0` faces world `-Z`. Independently derived (twice, cross-checked) to be geographic **north**: `scripts/generate_daklak_terrain.py`'s crop puts north at pixel row 0 (`terrainHeightSampler.ts`'s mapping), and `worldZ = mercatorY` decreases with latitude (`worldCoordinates.ts`) — so `-Z` and "north" are the same direction for the same underlying reason. `hud/worldHudFormat.ts`'s `yawToCompassDegrees` is yaw-in-degrees directly (no sign flip needed): `yaw = 0 -> 0° (N)`, `yaw = 90° -> 90° (E)`, verified in `worldHudFormat.test.ts`.

## Controls

| Action               | Walk                                                                                          | Fly                              |
| -------------------- | --------------------------------------------------------------------------------------------- | -------------------------------- |
| Move                 | `W A S D` / arrows                                                                            | `W A S D` / arrows (pitch-aware) |
| Look                 | Mouse (Pointer Lock) / touch drag                                                             | same                             |
| Run / descend        | `Shift` = run                                                                                 | `Shift` = descend                |
| Jump / ascend        | `Space` = jump (held = auto-hop on landing, a deliberate simplification — not edge-triggered) | `Space` = ascend (held)          |
| Interact             | `E` (or tap, in range)                                                                        | —                                |
| Release pointer lock | `Esc`                                                                                         | `Esc`                            |

Tour mode has no direct movement input — see below.

## POI system

`poi/worldPoi.ts` is a **runtime adapter** over Phase T2/T4's `TourismDestination[]`, not a second, forked data model — it adds one field (`world: {x, z}`, precomputed once at module load) on top of the real, sourced dataset (`src/entities/tourism/verifiedTourismDestinations.ts`, 5 entries as of Phase T4 — the original 4 plus `krong-kmar-waterfall`, each with a cited `sourceUrl`; see that file's own doc comment for why no more may be added without an equivalent source). There is deliberately no `nameEn`/`descriptionEn` — the source data has none, and fabricating an English translation would violate this domain's own provenance rule; the English UI shows the same Vietnamese description text.

`findNearestPoi(position)` + `POI_PROXIMITY_RADIUS` drive: the HUD's "nearest POI" display (always shown, whatever the distance), the Walk-mode interact hint (only within range), and `PlayerRig.tsx`'s `E`-interact handler (`selectPoi()` only fires within range).

**Non-canvas access — task requirement, not an afterthought.** `WorldDestinationMarkers.tsx`'s in-canvas info panel (Phase T2, unchanged markup) is still the panel that opens for a marker click _or_ an `E`-interact _or_ the POI list's "view details" — all three now drive the same shared `selectedPoiId` (`worldExplorationStore.ts`), not three disconnected notions of "which POI is open". Additionally, `hud/WorldPoiList.tsx` is a fully independent, keyboard-navigable, non-canvas accessible list (every POI's name/category/description/source link readable there regardless of camera position or mode) — the task's explicit requirement that "Canvas không được là cách duy nhất để truy cập thông tin POI".

## Guided tours

`tours/worldTours.ts` is plain data (`{id, titleKey, descriptionKey, stops: string[]}`); `tours/tourEngine.ts` is the one playback engine every tour runs through — no per-tour hardcoded logic. With 5 real, verified destinations in this repo as of Phase T4, the 3 shipped tours are themed groupings of those same 5 stops (not the task brief's illustrative "coffee & culture" example — there is no sourced coffee/agriculture POI yet, and inventing one would violate the domain's provenance rule):

- **Hồ & Thác — Đắk Lắk sông nước**: Hồ Lắk -> Đray Nur -> Krông Kmar (Phase T4 added the third stop once `krong-kmar-waterfall` was verified).
- **Rừng quốc gia & Buôn làng voi**: Yok Đôn -> Buôn Đôn.
- **Khám phá trọn vẹn Đắk Lắk**: all 5, in one tour.

`advanceTourProgress` is a pure state machine (`dwelling -> traveling -> dwelling -> ... -> finished`), driven by `TourRig.tsx`'s `useFrame`. Travel duration per leg is derived from real inter-POI distance / a fixed travel speed (not a fixed per-leg duration — `tourEngine.test.ts` specifically asserts the phase-completion decision and the reported camera position never drift apart, which an earlier version of this code had a bug in: the completion check used a hardcoded 1-second cutoff while position interpolation used a real distance-derived duration).

**`prefers-reduced-motion: reduce`** skips the `traveling` phase's continuous camera motion entirely — the tour jumps straight to each next stop instead of animating toward it (dwelling, a static pause to read the POI panel, is not motion and stays either way). Same policy `WorldFlyInCamera.tsx` already applies to its own intro.

## Performance

- **Still lazy-loaded, still isolated.** `App.tsx`'s dynamic `import()` for `WorldExplorationView` is unchanged; `?view=overview`/`3d`/`2d`/`map` never fetch this chunk (`e2e/world-exploration.spec.ts`'s Phase T1 chunk-isolation tests, unmodified, still pass). The chunk grew from Phase T3's 31.8 KB raw / 10.5 KB gzip to **35.68 KB raw / 11.72 KB gzip** with Phase T4's road layer, lighting presets, and elevation code — still a small fraction of the shared `three-vendor` chunk every other 3D-using view already pays for; `check:budget` passed with 0 threshold changes.
- **No per-frame allocation in the hot path.** `playerMovement.ts`'s functions return a new `PlayerBodyState` object per call (unavoidable, and cheap — a handful of numbers), but do not allocate arrays/closures inside the loop body beyond that.
- **Throttled HUD commits.** `PlayerRig.tsx`/`TourRig.tsx` keep the authoritative, continuously-updated pose in a local ref/the camera itself, and only commit a throttled (150ms) snapshot to `worldExplorationStore`'s `pose`/`nearestPoiId` for HUD display — subscribing the HUD to per-frame state would force it to re-render 60x/second for numbers nothing needs updated that fast.
- **One terrain decode, ever.** `loadTerrainHeightSampler()`'s module-level promise cache means the PNG is fetched/decoded exactly once regardless of how many components (`PlayerRig`, `TourRig`, and — as of Phase T4 — `WorldDestinationMarkers`/`WorldRoadLayer`/`WorldWaterPlane`) call `useTerrainSampler()`.
- **Existing device-tier system reused unchanged** (`graphicsQuality.ts`, `WorldScene.tsx`) — DPR cap, antialiasing, on constrained devices.
- **Road geometry built once, memoized.** `WorldRoadLayer.tsx` derives its `BufferGeometry` buckets via `useMemo` (not effect+`setState`, which this repo's `react-hooks/set-state-in-effect` lint rule flags as a cascading-render risk) — recomputed only when the fetched road data or the terrain sampler changes (i.e. once, when the sampler resolves after the initial flat-height render).
- **Not done in this phase** (see "Future extension"): vegetation instancing, LOD/frustum culling beyond what Three.js does by default. The terrain mesh is still the same single `192x160`-segment plane Phase T1 shipped — adequate at this scale, unchanged.

## Accessibility

- **Every HUD control is a real `<button>`/`<dialog>`-role element**, not canvas-drawn text — keyboard-Tab-reachable, screen-reader-labeled (`aria-label`/`aria-pressed`/`aria-expanded` throughout `hud/*.tsx`).
- **Non-canvas POI access**: `WorldPoiList.tsx` (see above).
- **Reduced motion**: honored by the intro handoff timing, `TourRig.tsx`'s travel-phase skip, and (pre-existing, Phase T1) `WorldFlyInCamera.tsx`'s own orbit.
- **WebGL-unsupported fallback**: unchanged from Phase T1 (`MapFallback`, `hasWebGLSupport()`) — the entire interactive layer degrades gracefully to that fallback exactly as before; nothing in Phase T3 assumes WebGL exists earlier than that check already did.
- **Dialog focus management**: `WorldPoiList.tsx`/`WorldTeleportMenu.tsx`/`WorldGuideDialog.tsx` all follow the same pattern already established by `OnboardingOverlay.tsx` — focus the close/primary button on open, `Escape` closes, focus returns to the previously-focused element on close.
- **First-time onboarding** (`WorldGuideDialog.tsx`) is a _new_, world-specific dialog — Phase T1's postmortem explicitly deferred this rather than reusing the existing `OnboardingOverlay.tsx`'s copy (which describes a different camera model entirely); see that file's doc comment. Its own storage key (`daklak-dashboard:world-onboarding-dismissed`) is separate from the admin-boundary dialog's, so dismissing one never dismisses the other.
- **Not fully screen-reader-navigable**: first-person WASD/mouse-look movement itself is inherently pointer/keyboard-centric, like any real-time 3D exploration — this is an inherent property of the feature, not an oversight; the POI list and teleport menu are the accessible path to the same content and destinations without needing to "walk" anywhere.

## i18n

All Phase T3/T4 UI strings are new `worldExploration.*` keys in `src/i18n/messages/{vi,en}.ts` (vi is the source of truth; `dictionaryParity.test.ts` enforces 100% en coverage and matching `{placeholder}` tokens). No hardcoded visible strings — `scripts/check_i18n_hardcoded_strings.mjs` (run in `npm test`) verifies this. Phase T4 added `worldExploration.environment.*` (lighting-preset button labels) and updated the tour title/description strings that now mention `krong-kmar-waterfall`.

## Data provenance

Phase T3 built entirely on already-shipped, already-attributed assets. **Phase T4** adds one new sourced fact: `krong-kmar-waterfall`'s coordinates, found via WebSearch and verified directly against Vietnamese Wikipedia's MediaWiki API (`action=query&prop=coordinates`, not just the rendered page — see `reports/tourism-digital-twin/phase-status.md`'s Phase T4 section for the exact API call and response used to cross-check against a second, independent English Wikipedia article on Krông Bông district). The reused road layer (`src/data/loadRoads.ts`) and terrain textures were already documented in prior phases; no new provenance record was needed for them. See `docs/data-provenance.md` and `reports/tourism-digital-twin/phase-status.md` for the full, dated provenance records.

## Future extension

Explicitly out of scope for Phase T4, listed here so a future phase doesn't have to re-derive why:

- **Additional tours/POIs beyond `krong-kmar-waterfall`.** Phase T4 re-attempted sourcing for the 6 candidates T2 rejected (Buôn Akô Đhông, Đắk Lắk Museum, Khải Đoan Pagoda, Bảo Đại's Palace, Ngã sáu Ban Mê monument, Thác Krông Kmar) and found a real, verified Wikipedia coordinate for exactly one (Thác Krông Kmar, now added). The other 5 remain blocked — see `phase-status.md`'s Phase T4 section for what was checked and why each still lacks a citable source.
- **Road name/reference labels inside `?view=world`.** `WorldRoadLayer.tsx` renders only line geometry, not `RoadLayer3D.tsx`'s label placement/dedup logic — a reasonable, scoped follow-up, not required by this phase.
- **A precise Hồ Lắk shoreline.** `WorldWaterPlane.tsx` is a modest illustrative disc at the real point location, not a real GIS shoreline polygon (none exists in this repo) — see that file's doc comment for why drawing one would violate the "no fabricated geographic data" rule.
- Prior-phase items not re-attempted this phase (see "Not done in this phase" list above): vegetation instancing, LOD/frustum culling beyond Three.js defaults, a physics engine.

Items carried over from Phase T3's own list that Phase T4 completed (ground-anchored markers, lighting presets, road-layer reuse — see above) are no longer listed here. Still open:

- **A physics engine** — only if a future feature genuinely needs body-to-body collision this height-based approach can't provide (see "No physics engine" above).
