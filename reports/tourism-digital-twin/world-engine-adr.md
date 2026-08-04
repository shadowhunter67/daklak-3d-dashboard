# ADR — World-engine selection for the Đắk Lắk Tourism Digital Twin

- Status: accepted (Phase T0)
- Date: 2026-08-04
- Baseline SHA reviewed: `1741ed0cdee017b9eeee896ac651cc9800af8e39` (main)
- Author: background agent, Phase T0 assessment (see `reports/tourism-digital-twin/architecture-assessment.md` for the full source-code inventory this decision is based on)

## Question

Should the eventual "Đắk Lắk Tourism Digital Twin" (explorable 3D world, guided tours, "what can
I see from here" viewshed) be built by **(A) extending the existing react-three-fiber/Three.js
terrain pipeline** already in this repo, or **(B) adding CesiumJS as a new, separate,
lazy-loaded route**?

## What's actually in the repo (verified from source, not assumed)

- The existing `?view=3d` route (`src/components/map/AdministrativeMap.tsx`) is a real
  `@react-three/fiber` `Canvas` (`@react-three/fiber@^9.4.0`, `@react-three/drei@^10.7.0`,
  `three@^0.185.1` — `package.json`). It is **not** MapLibre-based; MapLibre
  (`src/components/detail-map/`) is a separate `?view=map` route with its own lazy chunk.
- The terrain (`src/components/map/TerrainSurface.tsx`, `terrainConfig.ts`) is a single displaced
  `planeGeometry` (`192×160` segments) covering the **entire province bbox**
  (`[107.484181, 12.160547, 109.458875, 13.695296]`, `daklak-terrain-metadata.json`), textured with
  a 1024×1024 color/height/normal/mask PNG set (1.83 MB / 258 KB / 719 KB / 7 KB raw). Elevation
  source: NASA SRTM (~2000) via Mapzen Terrarium tiles; imagery: Sentinel-2 cloudless 2016 (EOX,
  CC BY-SA 4.0) — both static, historical, explicitly labeled non-real-time in the metadata file
  itself (`"realtimeNotice"` field). This is already a province-scale terrain, not a toy/demo
  patch of ground.
- Camera: `CameraControls.tsx` — a `drei` `OrbitControls` rig with keyboard (arrow/WASD) angle
  control and a custom viewport-inset-aware auto-fit/pan system tuned to the terrain's real extent.
- Device-tier rendering: `src/utils/graphicsQuality.ts` — a pure, tested function deciding DPR cap
  / antialiasing / contact-shadows from `devicePixelRatio` + `hardwareConcurrency`, already wired
  into `AdministrativeMap.tsx`.
- Roads: `RoadLayer3D.tsx` + `daklak-roads.json` (604 KB), a pinned OSM Overpass snapshot
  (`scripts/build_daklak_roads.py`, snapshot date `2026-07-17`), rendered as 3D line geometry over
  the same terrain.
- GIS pipeline: `scripts/prepare_gis_source.py` (fetch/verify pinned snapshot) →
  `scripts/build_daklak_geojson.py` (borders/wards/labels) / `scripts/generate_daklak_terrain.py`
  (terrain textures) / `scripts/build_daklak_roads.py` (roads) — all Python, all already producing
  the assets under `src/assets/maps/daklak/` that ship in the app today.
- Bundle budget (`scripts/check_build_budget.mjs`, verified by running `npm run build && npm run
check:budget` on this branch): the existing `three-vendor` chunk is ~183 KB gzip, shared and
  already paid for by the `3d` view; total JS budget is 950 KB gzip with real headroom (see
  `reports/tourism-digital-twin/phase-status.md` for the actual measured numbers on this branch).

## Option A — Extend the existing R3F/Three.js pipeline

**Pros**, each tied to something verified above:

- Terrain, camera, device-tier quality, and roads are already real, already province-scale, and
  already shipped — zero new asset pipeline to build for T1.
- Zero new dependency. `three-vendor` is already a paid-for shared chunk; a new `?view=world` route
  reusing it adds a few KB, not a new multi-hundred-KB vendor chunk (Cesium's core bundle is
  materially larger than three.js alone).
- The existing lazy-route + additive-`DashboardView`-union pattern (`map`, then `overview` were
  each added this way — see `docs/adr/0002-static-host-routing.md` and
  `src/utils/dashboardUrl.ts`) is a proven, tested seam for adding `world` the same way, which is
  exactly what Phase T1 did (see `reports/tourism-digital-twin/phase-status.md`).
- The team already knows this stack: `CameraControls.tsx`, `graphicsQuality.ts`,
  `webglLifecycle.ts`, `MapErrorBoundary`/`MapFallback` are all real, tested, reusable pieces for a
  tourism scene, not hypothetical.

**Cons / real limits found in the code:**

- The terrain is a single flat-shaded displacement-mapped plane, not a tiled/streamed globe — fine
  at province scale (192×160 segments over ~220 km × ~170 km) but would need a different approach
  (chunked LOD terrain) if the product ever needs seamless zoom from province-view down to
  street-level walking scale in one continuous camera move. Nothing in the current terrain pipeline
  does that today.
- No existing CPU-side elevation query API — `TerrainSurface`'s height comes from a GPU
  displacement map sampled in the vertex shader; there is no already-built function to answer
  "what's the elevation at lon/lat X" outside the shader. This is why Phase T1's optional "Stand
  Here" feature was skipped rather than faked (see phase-status.md).
- No geodetic (WGS84-accurate) terrain projection — `terrainConfig.ts` uses the app's existing flat
  `projection()` (`src/utils/geo.ts`) for a small province extent; this is adequate for Đắk Lắk's
  size but is a real constraint if the product ever needs true global-scale accuracy.

## Option B — CesiumJS as a separate lazy-loaded route

**What would actually justify this**, and why none of it is true today:

- Cesium's real strength is a streamed, tiled, globe-scale terrain/imagery pipeline with built-in
  viewshed/terrain-query tooling. That matters when you need seamless global scale or true
  continuous zoom from orbit to street level, or when you need Cesium's built-in viewshed analysis
  rather than writing your own. **Nothing found in this repo's data or task requires global scale**
  — the whole product is one province, and the existing terrain already covers it at a resolution
  (1024²) already deemed adequate for the shipped `3d` view.
- Cesium ships its own large runtime (ion/Cesium.js core is materially bigger, gzip, than the
  three-vendor chunk this app already pays for) and its own asset/terrain-tile format, meaning the
  entire GIS pipeline (`scripts/generate_daklak_terrain.py` et al.) would need a parallel Cesium
  -compatible export path, not reuse of what exists.
- It's a second 3D engine running in the same app long-term (the existing `3d` analytical view is
  explicitly out of scope to touch/replace), which is a maintenance and bundle-budget cost with no
  offsetting capability gain at this scope.

## Decision

**Option A — extend the existing R3F/Three.js pipeline.** No genuine technical reason found in the
code or data for Cesium at this scope; the default-reuse bias stated in the task is confirmed by
what's actually in the repo, not just assumed. This ADR does **not** authorize adding Cesium later
without a fresh sign-off: if a future phase (T3+, "provincial scale-out" per the task's explicitly
out-of-scope list) needs seamless multi-province/global scale or built-in viewshed tooling Cesium
provides out of the box and hand-rolling it on the existing terrain plane becomes disproportionate,
that would be the trigger to revisit this ADR — not something to guess into T1/T2.

## What Phase T1 actually built on top of this decision

See `reports/tourism-digital-twin/phase-status.md` for the concrete `?view=world` vertical slice —
it reuses the terrain textures/dimensions from `terrainConfig.ts` directly (not the interactive
`TerrainSurface` component itself, to avoid coupling to the existing `3d` view's admin-selection
store state — see `src/features/world-exploration/WorldTerrainMesh.tsx`'s doc comment) and a new
minimal fly-in camera rig, confirming Option A's reuse thesis holds in practice, not just on paper.
