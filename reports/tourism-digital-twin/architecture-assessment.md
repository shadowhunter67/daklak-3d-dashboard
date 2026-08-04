# Phase T0 — Architecture assessment

Baseline SHA reviewed: `1741ed0cdee017b9eeee896ac651cc9800af8e39` (main, branch point for this
worktree). Everything below is **verified from source** by reading the actual files listed
(paths given), not assumed from naming conventions.

## 1. Routing / view-mode system

- Single-page app, no router library. Two independent URL mechanisms:
  - `src/utils/dashboardUrl.ts` — query-string state (`?view=&mode=&ward=`), parsed/serialized by
    `parseDashboardUrl`/`serializeDashboardUrl`, backing `DashboardView =
'overview'|'3d'|'table'|'map'` (pre-Phase-T1). Consumed by `src/stores/mapStore.ts`
    (`viewMode`) and synced to `window.location` by `src/hooks/useDashboardUrlSync.ts`.
  - `src/routing/hashRoute.ts` — hash-based routing (`#/projects`, `#/projects/:id`,
    `#/data-readiness`) for Project Portfolio/Detail/Data-Readiness, deliberately a **separate**
    module from `dashboardUrl.ts` (see `docs/adr/0002-static-host-routing.md`) — hash routes take
    priority over the 4 query-based views in `App.tsx`.
- `App.tsx` is the single composition root: it branches on `route.kind` (hash routes) first, then
  on `viewMode` (query-based views) for the remaining four experiences.
- Every existing view is its own `React.lazy` boundary except `ExecutiveOverview` (eager) — see the
  `lazy(() => import(...))` calls at the top of `App.tsx`.

## 2. The `3d` view (the "digital twin" starting point)

- Entry: `src/components/layout/MapViewport.tsx` — renders only when `viewMode === '3d'`, checks
  `hasWebGLSupport()` once (`src/components/map/webglLifecycle.ts`), falls back to
  `MapFallback` + a button that switches to `table` (2D list) if WebGL is unavailable.
- Canvas root: `src/components/map/AdministrativeMap.tsx` — a real `@react-three/fiber` `Canvas`
  (orthographic camera, `position: [0, 8.2, 15.5]`, `zoom: 246`), wrapped in `MapErrorBoundary`,
  remountable via a `key`-bump pattern on WebGL context loss (`WebGLContextMonitor`,
  `subscribeWebGLContext`).
- Terrain: `src/components/map/TerrainSurface.tsx` renders a single `planeGeometry` sized from the
  real province bbox (`terrainConfig.ts`, derived from `daklak-terrain-metadata.json`), displaced
  by a height-map texture, with hover/click hit-testing (`terrainHitTest.ts`) that writes into
  `useMapStore`'s `hoveredCode`/`selectedCode` — i.e. the terrain mesh doubles as the click surface
  for administrative-unit selection across the whole app (2D list, detail map, etc. all read the
  same `selectedCode`).
- Camera: `src/components/map/CameraControls.tsx` — `drei` `OrbitControls` plus a custom
  viewport-inset-aware auto-fit system (keeps the selected ward visible around floating panels/
  mobile sheets) and keyboard (arrow/WASD) angle nudging gated through `shouldHandleCameraKey`.
- Device-tier quality: `src/utils/graphicsQuality.ts` — pure function from
  `devicePixelRatio`/`hardwareConcurrency` to `{tier, maxDevicePixelRatio, antialias,
contactShadows}`, decided once per mount, documented as deliberately _not_ reactive to
  `reducedMotion` (see its doc comment).
- Roads: `src/components/map/RoadLayer3D.tsx` + `daklak-roads.json` (pinned OSM Overpass
  snapshot, `scripts/build_daklak_roads.py`), toggled by `roadsVisible` in the store.
- Overlays: `TerrainOverlays.tsx` (selection highlight, heatmap mode), `MapAnnotations.tsx`
  (labels).

## 3. State

- `src/stores/mapStore.ts` — one Zustand store (`useMapStore`) for the entire non-project-route UI:
  `viewMode`, `dataMode`, `selectedCode`/`hoveredCode`, `roadsVisible`, `labelsVisible`,
  `autoRotate`, `reducedMotion`, plus panel-open flags and the detail-map's own camera/layer state.
  Factory pattern (`createMapStore`) exists specifically so tests can inject initial state without
  touching `window.location`.

## 4. GIS data pipeline (Python, offline, pinned snapshots)

- `scripts/prepare_gis_source.py` — fetches/verifies a pinned upstream snapshot into
  `.cache/gis-source/` (checksummed).
- `scripts/build_daklak_geojson.py` — produces borders/wards/labels GeoJSON under
  `src/assets/maps/daklak/` (`daklak-borders.geojson` 9 MB, `daklak-wards.geojson` 10.9 MB,
  `daklak-labels.json` for the 102 administrative units referenced everywhere in the UI copy).
- `scripts/generate_daklak_terrain.py` — fetches Mapzen Terrarium elevation tiles (AWS Open Data,
  SRTM-derived, ~2000) + Sentinel-2 cloudless 2016 imagery (EOX, CC BY-SA 4.0), producing the
  1024×1024 color/height/normal/mask PNGs consumed by `TerrainSurface.tsx`. The metadata file
  (`daklak-terrain-metadata.json`) is explicit that this is a static historical snapshot, not
  real-time.
- `scripts/build_daklak_roads.py` — pinned OSM Overpass road snapshot (date-stamped
  `SNAPSHOT = "2026-07-17T00:00:00Z"` in source), clipped to the province.
- None of these scripts run at request time — everything is pre-baked into committed assets under
  `src/assets/maps/daklak/`, which is why the app has no live-data dependency for terrain/roads.

## 5. Entities / data contracts (must not be touched by tourism work)

- `src/entities/project/` — the Project Portfolio/Detail domain contract (see
  `docs/adr/0001-project-centric-domain.md`, `0006-canonical-project-portfolio-data-contract.md`).
  Confirmed this is entirely separate from the map/terrain code above — no import from
  `src/components/map/*` or `src/features/world-exploration/*` (added in Phase T1) touches
  `src/entities/project/*`, and vice versa.

## 6. Accessibility / resilience conventions already in place (T1 must follow, not invent)

- `prefers-reduced-motion` is read once in `App.tsx` and stored as `reducedMotion` in
  `useMapStore`; consumers (e.g. `autoRotate`) gate animation on it rather than re-reading the
  media query themselves.
- WebGL support is checked once via `hasWebGLSupport()` and cached; every WebGL-bearing route
  provides a real fallback UI (`MapFallback`) with an actionable next step, never a blank screen.
- `MapErrorBoundary` wraps every Three.js `Canvas` so a runtime failure degrades to `MapFallback`
  instead of crashing the app shell.
- Keyboard focus: each top-level view has a `tabIndex={-1}` focusable root element that `App.tsx`
  moves focus to on view change (`requestAnimationFrame(() => document.getElementById(targetId)
?.focus())`), and a matching skip-link target.
- All visible strings are routed through `src/i18n/messages/{vi,en}.ts` + `useTranslation()`/
  `tStatic()`; `scripts/check_i18n_hardcoded_strings.mjs` enforces this in `npm test`.
- Illustrative/demo data is always labeled in-UI (`illustrative-watermark` CSS class, `"DỮ LIỆU
MINH HỌA"` badge pattern in `MapViewport.tsx`) — this is the pattern Phase T1's `?view=world`
  badge follows (`"ILLUSTRATIVE — KỊCH BẢN MINH HỌA"`).

## 7. Bundle budget

- `scripts/check_build_budget.mjs` enforces gzip/raw ceilings on the production build
  (`totalJavaScriptGzipBytes: 950_000`, etc.) and is run via `npm run check:budget` after
  `npm run build`. Verified numbers for this branch (with Phase T1 added) are recorded in
  `reports/tourism-digital-twin/phase-status.md`.

This assessment is the factual basis for
`reports/tourism-digital-twin/world-engine-adr.md`'s Option A vs. Option B decision.
