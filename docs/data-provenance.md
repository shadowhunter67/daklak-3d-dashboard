# Data provenance

Geometry comes from the MIT-licensed `thanglequoc/vietnamese-provinces-database` snapshot recorded in `daklak-source-summary.json`. Administrative naming and codes reference Nghị quyết 1660/NQ-UBTVQH15 and Quyết định 19/2025/QĐ-TTg. Terrain attribution is documented in `ATTRIBUTION.md` and `THIRD_PARTY_NOTICES.md`.

`src/assets/data/metric-provenance.json` records status, period, source, URL, and retrieval date for each metric family. Provincial 2025 overview indicators are official-source values. Commune population/coverage/growth, energy nodes, and heatmap values are deterministic illustrative data and must never be presented as official statistics.

`npm run validate:data` verifies 102 unique units, 88 communes and 14 wards, EPSG:4326, valid/non-empty geometry, plausible bounds, exact code joins, required metric fields, representative label containment, provenance fields, source commit shape, and polygon overlaps. The report includes SHA-256 hashes for all critical inputs/artifacts.

Rebuild with the pinned source beside the repository under `../references`, then run `npm run build:gis`, `npm run build:terrain`, and `npm run validate:data`. Review any hash change as a data change; do not update generated outputs without updating provenance and attribution.
