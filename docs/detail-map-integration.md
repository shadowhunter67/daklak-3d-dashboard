# Detail map integration (MapLibre GL JS)

## Why MapLibre instead of Google Maps Platform

The detail map experience is built entirely on open-source, self-hostable technology so the
project never depends on Google Maps Platform billing, terms of service, or attribution
requirements: [MapLibre GL JS](https://maplibre.org/) for rendering, [PMTiles](https://protomaps.com/)
for self-hosted vector tiles, and OpenStreetMap-derived data. No Google Maps JavaScript API,
Places, Routes, Street View, Traffic, satellite, terrain, or geocoding is used anywhere in this
repository. No API key or billing account is required to run or deploy this project.

Features intentionally **not** implemented as Google-equivalents:

- **Traffic**: no real-time traffic data source exists for this project. The layer panel has no
  traffic toggle; adding one with fake colors would misrepresent real conditions.
- **Street View**: not implemented. `DetailedMapProvider` has no 360°-imagery method; adding one
  is a future extension point if the project ever gets a licensed/self-hosted 360° image source.
- **Places/geocoding**: `LocalSearch` only searches this project's own ward-name data
  (`daklak-labels.json`). See `GeocoderProvider` in `detailMapTypes.ts` for the adapter interface
  a future geocoding backend would implement — but the default, and the only one shipped, is the
  local provider. Nominatim's public server is not used for production search: its usage policy
  does not permit unbounded, unattributed application traffic, and evaluating a compliant setup
  is out of scope for this phase.
- **Routing**: not implemented. See "Routing (future)" below.

## Three experiences, one app

`viewMode` in `mapStore.ts` (backed by `DashboardView` in `src/utils/dashboardUrl.ts`) now has
three values: `'3d'` (existing React Three Fiber overview, unchanged), `'table'` (existing
accessible 2D directory, unchanged), and `'map'` (new: the MapLibre detail map). Only one ever
mounts at a time — `MapViewport` renders only for `'3d'`, `DetailMapViewport` only for `'map'`,
`DashboardPanels` renders nothing for `'map'` since `DetailMapViewport` owns its own layer panel.

`src/components/detail-map/detailMapTypes.ts` also defines a richer `MapExperience` union
(`'overview-3d' | 'detail-map' | 'directory'`) with `mapExperienceFromViewMode`/
`viewModeFromMapExperience` mapping functions, for any future code that wants the more
descriptive three-way name without touching the URL-facing `viewMode` values.

## Provider abstraction

The store and all business logic (measurement, search, ward selection) depend only on the
`DetailedMapProvider` interface (`detailMapTypes.ts`) — never on a `maplibre-gl` `Map` instance or
class directly:

- **`MapLibreProvider`** (`MapLibreProvider.ts`) — the real implementation.
- **`FakeMapProvider`** (`FakeMapProvider.ts`) — a deterministic placeholder used by unit tests,
  Playwright E2E, and local development (`VITE_DETAIL_MAP_PROVIDER=fake`) without needing a
  network tile source. It renders an inspectable `<div data-testid="fake-map-provider">` with the
  current layer/camera state mirrored into its `data-*` attributes.

`DetailMapViewport.tsx` picks the provider based on `VITE_DETAIL_MAP_PROVIDER` (default
`maplibre`) and logs a console warning if `fake` is ever active in a production build.

## What's real today vs. what's a documented gap

This phase intentionally ships **no fake/placeholder geodata**. Rather than faking a road network
or administrative boundary layer to "look done," every data-backed layer is either real or
honestly disabled:

| Layer                                                        | Status                                                                                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roads, road labels, place labels                             | **Disabled** — no PMTiles/vector source is configured (`VITE_DETAIL_MAP_SOURCE_URL` is empty by default). See "Building a real PMTiles source" below.                                        |
| Administrative boundaries, dashboard metric fill, heatmap    | **Disabled** — same reason; these are meant to reuse this project's existing ward GeoJSON (`daklak-wards-render.json`) once wired to a vector source, not duplicate it into a second format. |
| Terrain (`Địa hình` basemap)                                 | **Disabled** — no DEM/terrain-RGB source configured (`VITE_TERRAIN_SOURCE_URL` empty).                                                                                                       |
| Satellite (`Vệ tinh` basemap)                                | **Disabled** — no licensed satellite raster source configured (`VITE_SATELLITE_TILE_URL` empty).                                                                                             |
| Distance measurement                                         | **Fully implemented** — pure haversine math, no external API needed.                                                                                                                         |
| Local search                                                 | **Fully implemented** over `daklak-labels.json` ward names — no external geocoding call.                                                                                                     |
| Ward selection, camera sync, URL state, history push/replace | **Fully implemented and tested.**                                                                                                                                                            |

The `MapLayerPanel`/`BaseMapSelector` UI reflects this: disabled toggles show a `title`/
`aria-describedby` explanation ("Chưa cấu hình nguồn dữ liệu cho loại bản đồ này") rather than
silently doing nothing or, worse, animating as if they worked.

## Building a real PMTiles source (not yet done — manual process)

This is documentation for a future manual step, not something CI runs:

```text
OSM extract for Đắk Lắk
        │  (osmium extract, using scripts/gis-source.json's pinned upstream commit
        │   as the administrative-boundary reference — do not fetch a fresh unpinned
        │   extract without re-reviewing licensing/attribution)
        ▼
filter + normalize (osmium tags-filter / ogr2ogr, keep only the road hierarchy this
        │   project needs: motorway/trunk/primary/secondary/tertiary/residential/service/track)
        ▼
build vector tiles (tippecanoe, or tilemaker/planetiler if a from-scratch OSM pipeline
        │   is preferred over tippecanoe's GeoJSON-in-tiles-out model)
        ▼
package as PMTiles (pmtiles CLI: `pmtiles convert output.mbtiles daklak.pmtiles`)
        ▼
verify schema (source-layer names must match what RoadLayer.ts/
        │   AdministrativeBoundaryLayer.ts expect — see the style-building code in
        │   detailMapStyle.ts once real sources are wired there)
        ▼
upload to static storage/CDN (see "Hosting large files" below)
        ▼
MapLibre reads it via HTTP range requests (the pmtiles protocol registered in
    MapLibreProvider.initialize does this automatically once VITE_DETAIL_MAP_SOURCE_URL
    points at the file)
```

None of `osmium`, `tippecanoe`, `tilemaker`, `planetiler`, or the `pmtiles` CLI needs to be
installed to work on this repository otherwise — they're only needed when someone actually
executes this pipeline to produce `public/maps/daklak.pmtiles`. No such file is committed; a
multi-hundred-megabyte binary vector tile archive should never be committed to this repository
just to make the feature "look" finished — configure `VITE_DETAIL_MAP_SOURCE_URL` to point at
wherever it's actually hosted instead.

## Hosting large files: GitHub Pages limits

GitHub Pages **can** serve PMTiles correctly for small-to-medium files: it's static file hosting
over HTTP/2, and GitHub's CDN does support HTTP range requests (required by the pmtiles
protocol to fetch only the tiles a viewport needs, not the whole file). However:

- GitHub Pages enforces a **soft 1GB repository size guidance** and **100MB per-file hard limit**
  (files over 100MB are rejected by a normal `git push`; Git LFS raises this but Pages serving
  through LFS pointers doesn't work the way you'd want). A province-wide detailed OSM extract
  packaged as PMTiles can easily exceed 100MB depending on zoom range and road detail kept.
- There's no server-side cache-control tuning beyond what GitHub Pages sets by default, and no
  way to configure custom response headers (the same limitation already documented in
  `SECURITY.md` for CSP).

**Recommendation**: if the real PMTiles file stays under ~80-90MB (leaving headroom under the
100MB hard limit), committing it under `public/maps/` and serving it from GitHub Pages
same-origin is the simplest option and keeps the CSP's `connect-src 'self'` unchanged. If it's
larger — likely for a road network at higher zoom detail — host it on **Cloudflare R2**, **AWS
S3 + CloudFront**, or any static-file CDN that supports range requests, and point
`VITE_DETAIL_MAP_SOURCE_URL` at that URL. This is **not required to be implemented as part of this
change** — it's an operational decision for whoever produces the real dataset, made explicit here
so it isn't discovered by surprise later.

If the source ever moves off same-origin, update the CSP `connect-src` (and `img-src` if raster
tiles are added) in `index.html` accordingly — see `SECURITY.md`.

## Camera/URL sync design

- `src/components/detail-map/detailMapUrl.ts`: pure `parseDetailMapCamera`/`parseDetailMapLayers`/
  `serializeDetailMapParams`/clamp functions, plus `camerasApproximatelyEqual` (epsilon comparison)
  and `layerStatesEqual`.
- `src/hooks/useDashboardUrlSync.ts` is the **single** writer to `window.history` for the whole
  app (base `view`/`mode`/`ward` params and, only while `viewMode === 'map'`, the detail-map
  params together). A second independent writer would race with it and corrupt the query string;
  see the code comment there for why this wasn't split into two hooks each calling
  `pushState`/`replaceState` on their own.
- `useDetailMapCameraSync.ts` debounces provider `moveend` events 400ms and skips the update
  entirely (no store write, no re-render, no history write) when the new camera is within epsilon
  of the current one — this is what prevents a map → store → URL → map feedback loop, together
  with `mapStore.ts`'s own epsilon guard in `setDetailMapCamera`.
- History rule: a ward-only or camera-only or layer-only change **replaces** the current entry; a
  view/data-mode experience change **pushes** — even if it happens together with a layer/camera
  change in the same store update.

## Interaction modes

`MapInteractionMode` is `'browse' | 'measure'`, held as local state in `DetailMapViewport` (not in
the global store — it's transient UI state, not shareable/URL state). In `browse` mode, a map
click resolves to a ward code (or `null`) via `onWardClick` and calls `select()`. In `measure`
mode, the same click instead adds a point via `onMapClick` (a raw lat/lng callback added to
`DetailedMapProvider` beyond the task's baseline sketch — `onWardClick` alone cannot supply the
coordinate distance measurement needs). Escape exits measurement without also closing the layer
panel it's nested in — see the `suppressEscapeClose` prop on `MapLayerPanel` and the code comment
explaining why two independent document-level Escape listeners would otherwise both fire.

## Routing (future)

Not implemented, and not planned for this phase. If it's ever added:

- It requires a real routing backend (OSRM, Valhalla, or GraphHopper) that **cannot** run inside
  GitHub Pages — Pages is static file hosting with no server-side compute. It would need a
  separately hosted service, a maintained road graph, and ongoing data updates.
- Public OSRM/Valhalla demo servers must not be used for production traffic without explicitly
  reviewing and accepting their usage policy — treat that the same way this document treats
  Nominatim's public server for search.
- Until a backend exists, no route-planner UI should appear at all (not a disabled button — an
  absent one), matching how terrain/satellite are hidden-with-reason rather than fake.

## Development and testing without real data

```bash
VITE_DETAIL_MAP_PROVIDER=fake   # default in this repo's Playwright config and recommended for local dev
VITE_DETAIL_MAP_SOURCE_URL=     # empty until a real PMTiles file exists
VITE_TERRAIN_SOURCE_URL=
VITE_SATELLITE_TILE_URL=
```

`FakeMapProvider` requires no network access and renders synchronously enough for Vitest/RTL and
Playwright to assert against. Production must set `VITE_DETAIL_MAP_PROVIDER=maplibre` (the
default when the variable is unset).
