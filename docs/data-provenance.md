# Data provenance

The fetch manifest is `scripts/gis-source.json`: repository `https://github.com/thanglequoc/vietnamese-provinces-database.git`, commit `1253e2ad7933bcc59a5b68a03a81b532cd939e3e`, and source-directory SHA-256 `41533e58c5726d10a65f01b24ea0d22f03e588f6297827a19b2e21ed12d1e050`. `npm run prepare:gis-source` stores a sparse checkout at `.cache/gis-source/repository`, verifies commit and checksum, and avoids the network when valid. Use `--refresh` to replace it or `npm run prepare:gis-source:offline` after the first fetch. The former manual `../references` workflow is obsolete.

Geometry comes from the MIT-licensed `thanglequoc/vietnamese-provinces-database` snapshot recorded in `daklak-source-summary.json`. Administrative naming and codes reference Nghị quyết 1660/NQ-UBTVQH15 and Quyết định 19/2025/QĐ-TTg. Terrain attribution is documented in `ATTRIBUTION.md` and `THIRD_PARTY_NOTICES.md`.

`src/assets/data/metric-provenance.json` records status, period, source, URL, and retrieval date for each metric family. Provincial 2025 overview indicators are official-source values. Commune population/coverage/growth, energy nodes, and heatmap values are deterministic illustrative data and must never be presented as official statistics.

`npm run validate:data` verifies both canonical and frontend render geometry: 102 unique units, 88 communes and 14 wards, EPSG:4326, valid/non-empty geometry, positive areas, exact render/metric/label code joins, metric value ranges, representative label containment, provenance fields, source commit shape, and polygon overlaps. The report includes SHA-256 hashes for all critical inputs/artifacts, including `daklak-wards-render.json`.

Rebuild from the verified in-project cache with `npm run build:gis`, then run `npm run build:terrain` and `npm run validate:data`. Review any hash change as a data change; do not update generated outputs without updating provenance and attribution.

## 3D building footprints (pilot: phường Buôn Ma Thuột only)

`?view=world`'s `WorldBuildingsLayer` renders real OpenStreetMap building footprints, extruded to
an illustrative height — but only for one ward, code `24133` (phường Buôn Ma Thuột), not the whole
province. `scripts/build_daklak_buildings.py` queries the Overpass API for `way["building"]` inside
that ward's bounding box, clips each footprint to the ward's real administrative polygon, and
estimates a height per building: the OSM `height` tag if present, else `building:levels` × 3.3m,
else a documented per-`building=*`-type default level count (see `DEFAULT_LEVELS_BY_TYPE` in the
script) — every feature records which method produced its `heightMeters` in its own
`heightMethod` field, so an estimated height is never indistinguishable from a measured one.

Snapshot pinned at `osm-buon-ma-thuot-buildings-20260901` (raw Overpass response cached at
`.cache/building-source/`, not committed; re-fetch with `--fetch`). Output:
`src/assets/maps/daklak/daklak-buildings-buon-ma-thuot.json` (canonical),
`building-source-registry.json` (OpenStreetMap contributors, ODbL 1.0 — same license terms as the
existing road layer), and `building-metadata.json` (checksums, query text, per-height-method
feature counts). The runtime asset is `public/data/daklak-buildings-buon-ma-thuot.json.gz`. Rebuild
with `npm run build:buildings` (requires `daklak-wards.geojson` to already exist —
run `build:gis` first).

Not yet done for `?view=world` specifically, as a deliberate pilot-scope limit rather than an
oversight: the other 101 wards have no _extruded 3D_ building layer there. (A separate,
province-wide but flat-2D building layer now exists for the detail map — see "Detail map data"
below; the two pipelines coexist on purpose: this Overpass-based one with per-feature height
estimation for `?view=world`'s Three.js extrusion, and the osmium/tippecanoe one below with no
height data at all, since a flat MapLibre `fill` layer has no use for it.) (Registered as
`building-footprints-buon-ma-thuot-pilot` in
`src/data-platform/catalog/datasets.ts` — required, not optional, since `config/public-data-files.json`
entries must resolve against a real catalog dataset id; see that file's own status
`partially-verified`.)

**Height scale history (2026-09-01)**: the first two shipped versions of
`worldBuildingGeometry.ts`'s height scale (`0.08` linear, then `0.12`/`0.015 * sqrt(meters)`) were
each independently "tuned by feel" against the walking camera's eye height, without a shared
ground-truth ratio to check against — and without checking the result against the whole-province
overview camera in an actual browser. That made this ward's one real 19-story tower render as a
multi-world-unit spike — visibly broken, reported by a user looking at the deployed `?view=world`
overview (PR #105 fixed the symptom by lowering the scale). Root-caused and fixed properly in the
human-scale/procedural-density work that followed (`reports/tourism-digital-twin/world-scale-lod-adr.md`):
buildings now use `metersToWorld` (`coordinates/worldScale.ts`) — true 1:1 real-world height,
derived from the same Mercator projection every other real coordinate in this scene already uses,
not an independent scale. See that ADR for why objects use the true horizontal scale while terrain
keeps its own exaggerated vertical scale, and for the camera-side work (altitude-relative near/far
and movement speed) needed to make a true-scale building actually read as tall from up close.

## Detail map data (roads, buildings, places) — built 2026-09-02

The detail map (`?view=map`, see [docs/detail-map-integration.md](detail-map-integration.md)) reuses
this project's own administrative-boundary GeoJSON (`wardBoundaryLayers.ts`, unconditional) plus a
real OpenStreetMap-derived PMTiles archive for roads/buildings/places (`roadLayers.ts`/
`buildingLayers.ts`), built via `osmium`/`tippecanoe`/`go-pmtiles` — a different pipeline from the
Overpass-based scripts above, chosen specifically because Overpass query budgets don't scale to a
whole-province extract the way a bulk OSM PBF + local processing does. Full command-by-command
pipeline: [docs/detail-map-integration.md](detail-map-integration.md).

**Source**: Geofabrik Vietnam extract `vietnam-260831.osm.pbf` (dated snapshot, not `-latest` —
Geofabrik only retains dated files ~90 days, so a re-pin is required periodically; see
`scripts/osm-pbf-source.json` for the pinned URL + sha256). Clipped to Đắk Lắk via `osmium extract
--strategy=complete_ways` against a polygon derived from this project's own `daklak-outline.geojson`
(buffered 0.005° / simplified 0.0005° — see `scripts/build_detail_map_boundary.py`). Filtered via
`osmium tags-filter` (roads: `highway=motorway...track` + `_link` variants; buildings: `wr/building`;
places: `n/place=city...isolated_dwelling`) and exported to GeoJSON-seq via `osmium export`.

**Verified feature counts** (osmium fileinfo, post-extract): 71,592 road ways, 2,795 building ways +
13 relations, 2,202 place nodes — 1.69% of Vietnam's total ways, consistent with Đắk Lắk's ~4% land
area and below-average OSM mapping density. **Building coverage is genuinely sparse outside city
centers**: OSM volunteer mapping in this province, like most of rural/highland Vietnam, has
concentrated on Buôn Ma Thuột and a handful of towns — vast rural/agricultural areas have real houses
on the ground with no corresponding `building=*` footprint in OSM yet. This is not a pipeline bug;
it is the honest state of the underlying open data (see `DETAIL_MAP_ROAD_BOUNDARY_PMTILES_DATASET`'s
`knownLimitations` in `src/data-platform/catalog/datasets.ts`).

**Build**: `tippecanoe` per-layer (roads `-Z5 -z15` with a zoom-tiered `--feature-filter-file` that
drops `service`/`track` at low zoom; buildings `-Z13 -z15`, no height/`building:levels` attribute —
this is a flat 2D `fill` layer, not the extruded pilot above), `tile-join`'d into one archive, then
`pmtiles convert` to spec v3 (matching the `pmtiles@^4.5.0` npm client already in `package.json`).
Toolchain pinned in a repo-local `Dockerfile` (`scripts/detail-map-tiles/Dockerfile`): osmium-tool
(Debian bookworm package), tippecanoe 2.79.0 (built from source), go-pmtiles 1.31.2 (release
tarball) — build-time only, never a runtime dependency, never run in CI.

**Output**: `public/maps/daklak.pmtiles`, 13.4MB, sha256
`5bb48508177f4bb722eec3d33b8574ed65b53cadc8a7d5c0ebdf9ee4ba844da5` (registered in
`config/public-data-files.json`, catalog entry `road-network-detail-map-pmtiles`). Committed to the
repo and served same-origin from GitHub Pages (`VITE_DETAIL_MAP_SOURCE_URL=maps/daklak.pmtiles` in
the committed `.env.production`) — the file turned out far smaller than an early 35-90MB estimate
(sparse building coverage, see above), so same-origin was simpler than the GitHub-Release-asset
hosting path originally sketched in `docs/detail-map-integration.md`: no CSP `connect-src` change,
no cross-origin range requests. `scripts/check_build_budget.mjs`'s `totalBuildBytes`/
`largestAssetBytes` limits were raised accordingly, with the reasoning recorded in that script's own
comment.

**Labels**: `road-labels`/`place-labels` symbol layers use self-hosted Noto Sans Regular glyph range
PBFs (`public/fonts/Noto Sans Regular/`, SIL OFL 1.1, catalog entry `map-glyphs-noto-sans`) — never
a live third-party glyph server (this project's no-external-map-API rule, `SECURITY.md`). Ranges
`0-255`/`256-511`/`7680-7935` (Latin Extended Additional — where most Vietnamese precomposed
diacritics live)/`8192-8447` were chosen to cover Vietnamese + Latin text actually used.

OpenStreetMap data is © OpenStreetMap contributors, ODbL 1.0 — `roadLayers.ts`'s
`OPENSTREETMAP_ATTRIBUTION` constant is wired into the vector source's `attribution` field, which
MapLibre's attribution control (never hidden, per `docs/accessibility.md`) renders as a real link.
