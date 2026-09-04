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

| Layer                                                           | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrative boundaries, ward selection highlight             | **Real, always on** — bundled `daklak-wards-render.json` (`wardBoundaryLayers.ts`), no env dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Ward/commune **name** labels                                    | **Real, on by default** — bundled `daklak-labels.json` (102 curated anchors + `priority`, `wardLabelLayers.ts`), the same data the 2D SVG map labels from. Needs only the self-hosted glyphs, **not** the PMTiles source; own `Tên xã/phường` toggle / `wardlabels` URL param. The selected ward's name stays shown even with the toggle off.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Roads, road labels, buildings, place labels                     | **Real** — built from a real Geofabrik OSM extract into `public/maps/daklak.pmtiles`, same-origin (`VITE_DETAIL_MAP_SOURCE_URL=maps/daklak.pmtiles` in the committed `.env.production`). Empty by default in dev/local/CI (offline determinism). See "Building the real PMTiles source" below and `docs/data-provenance.md`.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Planning overlays (`Quy hoạch (minh họa)`)                      | **Illustrative only** — 6 radio-selected schematic themes (`planningThemes.ts`): categories assigned by deterministic `classify()` rules (ward type + area + small hand-curated name overrides) painted onto the **real** ward polygons. No official plan, no survey data; the panel always shows a "no legal validity" disclaimer. `planning` URL param; one translucent `fill` layer reusing the `ward-boundaries` source (zero extra geometry payload).                                                                                                                                                                                                                                                                                      |
| Key projects (`Dự án trọng điểm (tham khảo)`)                   | **Real projects** — `keyProjects.ts` is a bundled FeatureCollection of ~30 prepared / under-construction / recently-tendered projects (expressways, high-speed rail, the BMT ring road, reservoirs, ports, industrial parks, airports, real-estate KĐT…), each with its own `sourceUrl`. Geometry is two-tier: the CT.24 / high-speed-rail / BMT-bypass corridors use **OpenStreetMap-derived centrelines** (`geom: 'osm'`, ODbL, attributed on the source), everything else is **hand-placed** from public route maps (`geometryConfidence: 'gần đúng'`). The click popup states which. Off by default; `projects` URL param; colour = status. Separate concern from the illustrative planning overlays and from the fictional demo portfolio. |
| Approved planning zones (`Ranh quy hoạch đã duyệt (tham khảo)`) | **Real, officially-approved zones, schematic boundaries** — `planningZones.ts` bundles a handful (not province-wide) of real economic/industrial/urban zones (Khu kinh tế Nam Phú Yên, KCN Hòa Phú, KCN Phú Xuân, the Ecopark/"ERA City" parcel), each cited to its own decision/source. The province's real parcel-level QHSDĐ map cannot be embedded at all (see below) — these polygons are instead hand-digitized from each zone's own published bounding description/area, `geometryConfidence: 'gần đúng'`, not a cadastral boundary. Click → popup with source + caveat. Off by default; `zones` URL param.                                                                                                                              |

## mapeffect.app-style reveal animations (capabilities 1 & 2)

Per `reports/detail-map/mapeffect-capabilities-integration.md`, turning ON the key-projects or
planning-zones reference layers (`?projects=1` / `?zones=1`, or the layer-panel checkboxes) now
plays a reveal animation instead of the layer just appearing — both `reducedMotion`-aware (settles
instantly, no animation) and skipped entirely on initial page load (a shared URL with the layer
already on doesn't animate on arrival, only a live toggle does):

- **"Khoanh vùng"** (`revealAnimation.ts`) — the planning zones glow-reveal in, generalizing
  `wardHighlightAnimation.ts`'s ward-selection bloom to arbitrary fill+line targets.
- **"Vẽ đường"** (`lineDrawAnimation.ts`) — the key-projects corridor lines grow from their start
  point while the project points/labels fade in, by mutating the shared GeoJSON source's data each
  animation frame (`sliceLineByRatio`/`sliceFeatureCollectionLines`), not a new source/layer.

Both live in `MapLibreProvider.setKeyProjectsVisible`/`setPlanningZonesVisible` (their own
`requestAnimationFrame` loops, cancelled on re-toggle/`destroy()`); the pure frame/geometry math is
unit-tested in isolation, same split as the existing ward-highlight animation.
| Dashboard metric fill, heatmap | **Disabled** — a separate, still-unbuilt illustrative-demographic feature, not part of the OSM pipeline above; deliberately not gated by the same env var (see `DetailMapViewport.tsx`'s `readSourceAvailability()` doc comment). |
| Terrain (`Địa hình` basemap) | **Disabled** — no DEM/terrain-RGB source configured (`VITE_TERRAIN_SOURCE_URL` empty). |
| Satellite (`Vệ tinh` basemap) | **Disabled** — no licensed satellite raster source configured (`VITE_SATELLITE_TILE_URL` empty). |
| Distance measurement | **Fully implemented** — pure haversine math, no external API needed. |
| Local search | **Fully implemented** over `daklak-labels.json` ward names — no external geocoding call. |
| Ward selection, camera sync, URL state, history push/replace | **Fully implemented and tested.** |

The UI reflects this honestly at two levels, since an empty canvas alone looked indistinguishable
from a rendering failure (see the "no source configured" report that prompted this section):

- `DetailMapSourceNotice` renders a permanent, non-blocking (`pointer-events: none`) explanation
  directly over the map canvas whenever `roads` isn't available (i.e. `VITE_DETAIL_MAP_SOURCE_URL`
  is empty — the default in dev/local/CI), so a first-time visitor sees an honest "waiting for
  data" message instead of a blank void with no explanation anywhere on screen. Administrative
  boundaries always render regardless, so the notice's copy talks about roads/buildings, not "the
  map background", once this PR's copy fix landed.
- In `BaseMapSelector`, the terrain/satellite basemap radios are genuinely `disabled` (with a
  `title`/`aria-describedby` explanation) because picking either would be a permanent dead end in
  the current session. In `MapLayerPanel`, the eight layer checkboxes (roads/road labels/place
  labels/boundaries/ward names/buildings/metrics/heatmap) are deliberately **not** `disabled` — they stay
  interactive and keep updating the store/URL (`roads=1`, `buildings=1`, `heatmap=1`, …) so a
  shared link still encodes the intended layers even for the two (metrics/heatmap) that still have
  no real data source. Each unavailable one gets a `title` plus an `aria-describedby` note
  ("Lựa chọn vẫn được lưu... hiện chưa có dữ liệu để hiển thị") explaining why toggling it has no
  visible effect yet — rendered as a sibling of the `<label>`, not nested inside it, so the long
  explanation doesn't leak into the checkbox's accessible name.

## Building the real PMTiles source (executed 2026-09-02)

None of `osmium`, `tippecanoe`, or the `pmtiles` CLI needs to be installed to work on this
repository day-to-day — they only run inside the pinned Docker toolchain below, and only when the
OSM extract needs to be rebuilt (e.g. Geofabrik's ~90-day retention forces a re-pin). Manual
process, not something CI runs. Full detail/reasoning/verified feature counts:
`docs/data-provenance.md`'s "Detail map data" section — this section is the mechanical
command-by-command record.

**Stage A — acquire + pin the OSM extract** (`scripts/osm-pbf-source.json`,
`scripts/prepare_osm_pbf.py`, `scripts/build_detail_map_boundary.py`):

```powershell
python scripts/prepare_osm_pbf.py          # downloads + sha256-verifies the pinned Geofabrik file
python scripts/build_detail_map_boundary.py # derives the osmium extract polygon from daklak-outline.geojson
```

**Stage B — Docker toolchain + province extract**. Build the pinned image once
(`scripts/detail-map-tiles/Dockerfile`: osmium-tool + tippecanoe 2.79.0 built from source +
go-pmtiles 1.31.2). **Use a named Docker volume + `docker cp`, never a bind mount** — this repo's
path contains a space and non-ASCII characters (`lập trình`), which Docker Desktop's WSL2-backed
bind mounts handle inconsistently (silently empty mounts) and slowly (Windows↔WSL2 filesystem
bridge) even when they do work. Also run every `docker` command from PowerShell, not Git
Bash/MSYS — MSYS rewrites `container:/path`-shaped arguments as if they were Windows paths,
silently corrupting the destination.

```powershell
docker build -t daklak-tiles:1 .\scripts\detail-map-tiles
docker volume create daklak-osm
docker run -d --name daklak-stage -v daklak-osm:/data daklak-tiles:1 sleep infinity
docker cp ".\.cache\osm-pbf\vietnam-260831.osm.pbf" daklak-stage:/data/vietnam.osm.pbf
docker cp ".\.cache\osm-pbf\daklak-extract-polygon.geojson" daklak-stage:/data/
docker cp ".\.cache\osm-pbf\extract-config.json" daklak-stage:/data/
docker exec daklak-stage mkdir -p /data/out
docker exec daklak-stage osmium extract --overwrite --strategy=complete_ways `
  --config /data/extract-config.json /data/vietnam.osm.pbf
```

Verify: `docker exec daklak-stage osmium fileinfo -e /data/out/daklak.osm.pbf` — bbox should be
Đắk Lắk's real envelope (≈107.5,11.8 → 109.2,13.4 for the _tight_ data, though `complete_ways` lets
a handful of very long ways — a coastline, a long river — stretch the raw bbox further; compare
way/node counts as a percentage of the full Vietnam file instead, which is the reliable check: this
run measured 1.69% of Vietnam's ways, matching Đắk Lắk's ~4% land area at below-average density).

**Stage C — tag filters + GeoJSON-seq export** (`osmium tags-filter` + `osmium export`, one pass
per layer — roads, buildings `wr/building`, places):

```powershell
docker exec daklak-stage osmium tags-filter --overwrite -o /data/out/roads.osm.pbf /data/out/daklak.osm.pbf `
  "w/highway=motorway,motorway_link,trunk,trunk_link,primary,primary_link,secondary,secondary_link,tertiary,tertiary_link,unclassified,residential,living_street,service,track"
docker exec daklak-stage osmium tags-filter --overwrite -o /data/out/buildings.osm.pbf /data/out/daklak.osm.pbf "wr/building"
docker exec daklak-stage osmium tags-filter --overwrite -o /data/out/places.osm.pbf /data/out/daklak.osm.pbf `
  "n/place=city,town,village,hamlet,suburb,quarter,neighbourhood,isolated_dwelling"
# then osmium export ... -f geojsonseq for each, with an --include_tags config trimming attributes
# to what roadLayers.ts/buildingLayers.ts actually read (highway/name/name:vi/ref; building/name;
# place/name/name:vi/population respectively) — see the export-*.json configs.
```

**Stage D — tippecanoe → mbtiles → pmtiles**. Explicit `-Z`/`-z` zoom ranges everywhere, never
`-zg` (auto-guessed zoom would make the tile schema non-deterministic across rebuilds and silently
invalidate the `source-layer`/zoom assumptions baked into `roadLayers.ts`/`buildingLayers.ts`).
Roads `-Z5 -z15` with a zoom-tiered `--feature-filter-file` (drops `service`/`track` below z10,
most residential-tier roads below z8, so low zoom doesn't smear); buildings `-Z13 -z15` (nothing
below city-block scale is meaningful); `tile-join` merges all three into one archive; `pmtiles
convert` packages spec v3.

```powershell
docker exec daklak-stage pmtiles show /data/out/daklak.pmtiles   # verify: mvt, z5-15, 3 vector_layers
docker cp daklak-stage:/data/out/daklak.pmtiles ".\public\maps\daklak.pmtiles"
docker rm -f daklak-stage
docker volume rm daklak-osm
```

**Stage E — code wiring**: `roadLayers.ts`/`buildingLayers.ts` (new files, mirroring
`wardBoundaryLayers.ts`'s source/layer-id-constants pattern), `detailMapStyle.ts` populating the
previously-empty seam with the real layer order (roads/buildings sit above the ward fill but below
the ward outline/selected-highlight, so the ward-selection glow always reads on top — see that
file's own doc comment), `DetailMapViewport.tsx`/`MapLibreProvider.ts` plumbing the real source URL

- self-hosted glyphs URL through (`detailMapStyle.ts` stays a pure function of its arguments —
  still no `import.meta.env` read inside it, so its own unit tests stay env-independent).

## Hosting: same-origin, decided by the build budget rather than the Pages 100MB limit

GitHub Pages **can** serve PMTiles correctly for small-to-medium files: it's static file hosting
over HTTP/2, and GitHub's CDN does support HTTP range requests (required by the pmtiles
protocol to fetch only the tiles a viewport needs, not the whole file). GitHub Pages also enforces
a soft 1GB repository size guidance and a 100MB per-file hard limit — the original version of this
section (2026-07-22) planned around that limit, assuming a province-wide OSM extract could easily
exceed 90MB and require hosting as a GitHub Releases asset (cross-origin, needing a CSP
`connect-src`/`img-src` change) instead.

**That plan changed once the pipeline actually ran.** The real `daklak.pmtiles` came out to
**13.4MB** — far smaller than estimated, because real building-footprint OSM coverage outside
Buôn Ma Thuột and a few towns is genuinely sparse (see `docs/data-provenance.md`). 13.4MB is
nowhere near the 100MB Pages limit, but it _is_ significant against this repo's own
`scripts/check_build_budget.mjs` performance budget (`totalBuildBytes` had only ~532KB of headroom
at the time). **Decision: commit `public/maps/daklak.pmtiles` to the repo, serve it same-origin
from GitHub Pages, and raise `totalBuildBytes`/`largestAssetBytes` to admit it** — see that
script's own comment for the full reasoning (same "a user who never opens the detail map never
downloads it" justification already used for the `maplibre-gl` chunk). This is simpler than the
Releases-asset path: no CSP change, no cross-origin range requests, `.env.production` just points
at the bundled file (`VITE_DETAIL_MAP_SOURCE_URL=maps/daklak.pmtiles`).

The GitHub-Releases-asset path (`gh release create`, a repointed `VITE_DETAIL_MAP_SOURCE_URL`, and
the CSP `connect-src` additions for `github.com`/`objects.githubusercontent.com`) remains the
documented fallback if a future rebuild (a much larger extract region, or a future province-wide
_extruded_ building layer) pushes the file size back up past what the build budget can reasonably
absorb — re-raising `totalBuildBytes` indefinitely to keep admitting an ever-larger same-origin
file would eventually become exactly the "raise a limit to paper over growth" move this project's
`AGENTS.md` asks not to do without measuring and explaining first.

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

`MapInteractionMode` is `'browse' | 'measure' | 'radius'`, held as local state in
`DetailMapViewport` (not in the global store — it's transient UI state, not shareable/URL state).
In `browse` mode, a map click resolves to a ward code (or `null`) via `onWardClick` and calls
`select()`. In `measure` mode, the same click instead adds a point via `onMapClick` (a raw lat/lng
callback added to `DetailedMapProvider` beyond the task's baseline sketch — `onWardClick` alone
cannot supply the coordinate distance measurement needs). In `radius` mode, a click sets the
centre of a radius query (`RadiusQueryTool` + `radiusQuery.ts`): given a centre and a preset
radius (1/3/5/10 km), it lists every real, already-loaded reference feature within range — key
projects (`keyProjects.ts`), approved planning zones (`planningZones.ts`), and ward/commune
centres (`daklak-labels.json`) — sorted nearest-first. Distance is haversine to a feature's
**nearest vertex** (not a true point-to-edge distance) — an approximation adequate for
near/far ranking, called out in the tool's own caveat. This is mapeffect.app capability 3 scoped
to the no-fabrication rule: there is no bundled OSM amenity (school/hospital/market) source, so
the tool does not invent one. Escape exits `measure`/`radius` without also closing the layer
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
