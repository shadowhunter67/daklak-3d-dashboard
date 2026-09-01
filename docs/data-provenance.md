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

Not yet done, as a deliberate pilot-scope limit rather than an oversight: the other 101 wards have
no building layer, and this dataset is not yet registered in `src/data-platform/catalog/` (the
typed dataset/layer catalog `docs/data-platform-architecture.md` describes — the existing road
layer is registered there; this pilot intentionally is not, to avoid guessing at that schema before
the pilot itself is reviewed).

## Detail map data (roads, boundaries) — not yet built

The detail map (`?view=map`, see [docs/detail-map-integration.md](detail-map-integration.md)) is
designed to reuse this project's own administrative-boundary GeoJSON and, separately, a real
OpenStreetMap-derived PMTiles road extract — no such PMTiles file is built or committed yet. When
one is produced: record its OSM extract date, the exact filter/build pipeline used, the PMTiles
file's own checksum, and the geographic bounds it covers, in this file, alongside the existing GIS
provenance fields above. OpenStreetMap data is © OpenStreetMap contributors, ODbL 1.0 — the
existing 3D/2D road layer already carries this attribution (see `RoadLayer2D.tsx`/`RoadLayer3D.tsx`);
the detail map's road layer must carry the same attribution once wired to real data, and the
MapLibre attribution control must never be hidden or covered by other UI (see
`docs/detail-map-integration.md` and `docs/accessibility.md`).
