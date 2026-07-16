# Architecture

`App` is high-level composition; `DashboardHeader`, `MapViewport`, `DashboardPanels`, and `DatasetFooter` own distinct layout responsibilities. A small query-string adapter synchronizes shareable state without a router.

The application is a static React/Vite site. `App` owns route-like 3D/2D composition, Zustand owns interaction state, and lazy boundaries isolate the Three.js map and ECharts panel. The 2D view is a first-class accessible fallback and does not mount or download either heavy component.

The WebGL layer is split into terrain surface, thematic overlays, annotations, camera controls, hit testing, and lifecycle recovery. A context-loss monitor removes its listeners on unmount and supports both restoration and an explicit remount. Dataset configuration is validated before rendering and a root error boundary prevents a malformed module from producing a blank page.

GIS processing is offline: a pinned source snapshot is normalized to EPSG:4326, repaired, simplified for rendering, and converted into geometry, borders, outline, labels, metrics, metadata, terrain textures, and machine-readable validation evidence. The browser never performs geoprocessing.

## Runtime flow

1. Load manifest and compact UI datasets.
2. Render the accessible shell and choose `?view=2d` or 3D.
3. Lazy-load WebGL/ECharts only when the 3D view needs them.
4. Convert pointer coordinates to longitude/latitude, bounding-box filter polygons, then run point-in-polygon.
5. Publish hover/selection through Zustand to the map, chart, details, and live region.

Static hosting has no server-side telemetry. Runtime errors are surfaced locally; adding external monitoring requires a privacy decision and is intentionally outside this repository.
