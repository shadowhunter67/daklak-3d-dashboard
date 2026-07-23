# Architecture

`App` is high-level composition; `DashboardHeader`, `MapViewport`, `DashboardPanels`, and `DatasetFooter` own distinct layout responsibilities. A small query-string adapter synchronizes shareable state without a router.

The application is a static React/Vite site with four mutually exclusive experiences: Executive Overview (`src/features/executive-overview/`, the default landing since Phase 2A — see [docs/adr/0001-project-centric-domain.md](adr/0001-project-centric-domain.md)), the 3D overview (React Three Fiber), the accessible 2D directory, and the detail map (MapLibre GL JS). `App` owns route-like composition between all four via `viewMode` ('overview' | '3d' | 'table' | 'map'), Zustand owns interaction state, and lazy boundaries isolate the Three.js map, ECharts panel, and MapLibre — only one heavy renderer is ever mounted at a time, and none of them is fetched until its experience is actually opened. Executive Overview itself is not a lazy boundary (it never imports Three.js/MapLibre/ECharts, and it's the default landing every visitor loads) — see [docs/performance.md](performance.md). The 2D directory is a first-class accessible fallback and does not mount or download any of the other three.

Executive Overview reads project-portfolio data through `ProjectPortfolioSource` (`src/entities/project/adapters/`), never importing the underlying mock dataset directly from a component — `BundledProjectPortfolioSource` (`src/data/projectPortfolioSource.ts`) is the only Phase 2A implementation, and a presentation-only read model (`buildExecutiveOverview`, `src/features/executive-overview/model/`) computes KPIs/alerts/priority-ranking from the domain layer (`src/entities/project/`) so components never compute business logic themselves. See [docs/domain-model.md](domain-model.md) for the domain layer this sits on top of.

The detail map is Google-Maps-Platform-free by design: MapLibre GL JS + self-hosted PMTiles/vector tiles instead of the Google Maps JavaScript API, with a `DetailedMapProvider` abstraction (`src/components/detail-map/detailMapTypes.ts`) so the store and business logic never depend on a `maplibre-gl` `Map` instance directly — see [docs/detail-map-integration.md](detail-map-integration.md) for the full design, what's real vs. disabled-pending-a-real-data-source, and why.

The WebGL layer is split into terrain surface, thematic overlays, annotations, camera controls, hit testing, and lifecycle recovery. A context-loss monitor removes its listeners on unmount and supports both restoration and an explicit remount. Dataset configuration is validated before rendering and a root error boundary prevents a malformed module from producing a blank page.

GIS processing is offline: a pinned source snapshot is normalized to EPSG:4326, repaired, simplified for rendering, and converted into geometry, borders, outline, labels, metrics, metadata, terrain textures, and machine-readable validation evidence. The browser never performs geoprocessing.

## Runtime flow

1. Load manifest and compact UI datasets.
2. Render the accessible shell and choose `?view=2d`, `?view=3d`, or `?view=map`.
3. Lazy-load WebGL/ECharts only when the 3D view needs them; lazy-load `maplibre-gl`/`pmtiles` only when the detail map is opened.
4. Convert pointer coordinates to longitude/latitude, bounding-box filter polygons, then run point-in-polygon.
5. Publish hover/selection through Zustand to the map, chart, details, and live region.

Static hosting has no server-side telemetry. Runtime errors are surfaced locally; adding external monitoring requires a privacy decision and is intentionally outside this repository.

The Vite build emits `build-info.json` into the same immutable artifact as the application. It records package version, source commit, UTC build time, pinned GIS source commit, and dataset snapshot without requiring a backend or exposing secrets.
