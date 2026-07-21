# Data provenance

The fetch manifest is `scripts/gis-source.json`: repository `https://github.com/thanglequoc/vietnamese-provinces-database.git`, commit `1253e2ad7933bcc59a5b68a03a81b532cd939e3e`, and source-directory SHA-256 `41533e58c5726d10a65f01b24ea0d22f03e588f6297827a19b2e21ed12d1e050`. `npm run prepare:gis-source` stores a sparse checkout at `.cache/gis-source/repository`, verifies commit and checksum, and avoids the network when valid. Use `--refresh` to replace it or `npm run prepare:gis-source:offline` after the first fetch. The former manual `../references` workflow is obsolete.

Geometry comes from the MIT-licensed `thanglequoc/vietnamese-provinces-database` snapshot recorded in `daklak-source-summary.json`. Administrative naming and codes reference Nghị quyết 1660/NQ-UBTVQH15 and Quyết định 19/2025/QĐ-TTg. Terrain attribution is documented in `ATTRIBUTION.md` and `THIRD_PARTY_NOTICES.md`.

`src/assets/data/metric-provenance.json` records status, period, source, URL, and retrieval date for each metric family. Provincial 2025 overview indicators are official-source values. Commune population/coverage/growth, energy nodes, and heatmap values are deterministic illustrative data and must never be presented as official statistics.

`npm run validate:data` verifies both canonical and frontend render geometry: 102 unique units, 88 communes and 14 wards, EPSG:4326, valid/non-empty geometry, positive areas, exact render/metric/label code joins, metric value ranges, representative label containment, provenance fields, source commit shape, and polygon overlaps. The report includes SHA-256 hashes for all critical inputs/artifacts, including `daklak-wards-render.json`.

Rebuild from the verified in-project cache with `npm run build:gis`, then run `npm run build:terrain` and `npm run validate:data`. Review any hash change as a data change; do not update generated outputs without updating provenance and attribution.

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
