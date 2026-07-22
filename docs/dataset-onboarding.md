# Adding a new dataset

There is no upload UI or ingestion pipeline — adding a dataset means a developer edits TypeScript,
same as adding a new metric did before this data platform existed.

## 1. Decide classification and delivery first

Read [docs/data-classification.md](data-classification.md). If the data is not genuinely public
with a checked source/license, it must **not** get `access.delivery: 'bundled-static'` — use
`'public-api'`, `'protected-api'`, or `'pmtiles'` instead, per
[docs/internal-data-integration.md](internal-data-integration.md).

## 2. Add a `DatasetDescriptor`

In `src/data-platform/catalog/datasets.ts` (or a new file re-exported the same way if the catalog
grows large enough to split), add an entry following the existing ones. Required real fields, not
placeholders:

- `source.organization` and, where they exist, `source.sourceUrl` (HTTPS only —
  `catalogValidation.ts` rejects anything else) / `documentNumber` / `license`. For a source that
  lives in this repo itself (a generator script, not a web URL), use `source.repositoryPath`
  (relative, no `..`) instead — never a fake `internal://` URI (the provenance UI would have
  nowhere sensible to link it).
- If names/geometry/metrics come from genuinely different-authority sources (the common case:
  legally-issued names/codes rendered with community-sourced geometry), set `authorityDetail`
  (`identityAuthority`/`geometryAuthority`/`metricAuthority`) instead of relying on the coarse
  `authority` fallback — see [docs/data-classification.md](data-classification.md#identity-vs-geometry-vs-metric-authority).
- `quality.status` — be honest: `verified` requires an independently checked source, not just "the
  website said so."
- `quality.knownLimitations` — at minimum, either a real `checksum`, or a limitation entry
  mentioning "checksum" explaining why not (`catalogValidation.ts` enforces this).
- `access` — see step 1. `access.delivery: 'bundled-static'` can never pair with
  `requiresAuthentication: true` — `catalogValidation.ts` rejects that contradiction.

Use `data-templates/dataset-catalog.json` and
`data-templates/schemas/dataset-descriptor.schema.json` as a starting shape if useful — they're
templates to copy from, not something the app reads.

## 3. If it has per-unit values: add indicators

In `src/data-platform/catalog/indicators.ts`, add an `IndicatorDefinition` (with
`allowedAdministrativeLevels` set to the level(s) the data is _actually verified at_ — never both
`'province'` and `'commune'` unless you have real data at both) and the corresponding
`IndicatorObservation` entries, with `sourceDatasetId` pointing at the dataset from step 2. Use
`null` for missing values, never `0`.

## 4. If it's a map layer: add a `MapLayerDescriptor`

In `src/data-platform/catalog/layers.ts`. If it belongs to the detail map's existing
`DetailMapLayerState`, also wire a toggle in `MapLayerPanel.tsx`'s local `layerToggles` array (see
the comment there for why toggle mechanics stay separate from the registry).

## 5. If it's a document, not spatial/tabular data: add a `DocumentReference`

In `src/data-platform/catalog/documents.ts`. Set `verificationStatus: 'research-needed'` unless you
(or whoever adds it) actually opened the source and confirmed title/number/date/authority/URL. If
`verified`, also set `evidenceLevel` honestly — `official-primary-document` only if you reached the
signed instrument itself (ideally on the issuing authority's own document portal, not a legal
aggregator); `official-publication-reference` if you only confirmed an announcement page about it.
See the two existing entries in `documents.ts` for both cases side by side, and
[docs/data-classification.md](data-classification.md#evidence-level-vs-verification-status).

## 6. If it backs a physical file under `src/assets/**` or `public/`: register it

**Do not skip this even if the file lives under a directory that "already has public files in
it."** `config/public-data-files.json` is an exact-path registry, not a directory allowlist — a
JSON/GeoJSON/CSV/TSV/PMTiles/PBF/MVT/TopoJSON/Parquet/Arrow/Feather file (`.gz`-compressed or not)
that isn't registered under its own exact path fails `npm run validate:public-build`, even if a
sibling file in the same folder is registered.

Add one entry per file to `config/public-data-files.json`'s `files` array:

```json
{
  "path": "src/assets/data/your-new-file.json",
  "datasetIds": ["your-dataset-id"],
  "classification": "public",
  "delivery": "bundled-static",
  "checksum": "<sha256sum your-new-file.json, 64 lowercase hex chars>"
}
```

- `path` — exact repo-relative POSIX path. No wildcards, no directory prefixes.
- `datasetIds` — every dataset id (from step 2) this file backs; each must already exist in
  `DATASET_CATALOG` with `classification: 'public'` and `requiresAuthentication: false` — the
  registry is cross-checked against the real catalog by `npm run generate:public-manifest` (fails
  loudly if it disagrees) and again by `validate:public-build`.
- `delivery` — `'bundled-static'` for a file imported directly into `src/` (ends up inside a JS
  chunk); `'public-static-asset'` for a file placed under `public/` (Vite copies it into `dist/`
  verbatim, with no import statement at all — the dist-scan checks it actually arrives there).
- `checksum` — a real `sha256sum <file>` of the actual file content. If the file is trivial (a
  handful of numbers, not worth hashing), omit `checksum` but then a `note` explaining why is
  **required** instead — the registry validator rejects an entry with neither.

A file dropped into `src/assets/**` or `public/` and left unregistered — or registered under the
wrong exact path — fails `npm run validate:public-build` (source mode checks `src/` imports _and_
walks all of `public/`) and, if it somehow reached `dist/` anyway, `npm run validate:public-build:dist`
too. Registering an entry is not itself evidence the data is safe to publish — classification,
license, and provenance are still your job from steps 1–2.

## 7. Validate

```bash
npm test                            # catalogValidationIssues must stay [] — includes the public-leakage check
npm run generate:public-manifest    # writes reports/public-dataset-manifest.json; fails if the registry disagrees with the catalog
npm run validate:public-build       # source-side leakage scan (src/ imports + public/ scan + registry cross-check)
npm run typecheck
npm run lint
```

If you added or changed a field in `src/data-platform/schemas/*.ts`, update the matching
`data-templates/schemas/*.schema.json` too, and add/adjust a fixture in
`data-templates/fixtures/{valid,invalid}/` so `schemaDriftGuard.test.ts` actually exercises the
change — see [docs/data-platform-architecture.md](data-platform-architecture.md#schema-drift-guard).

## 7. If it affects UI

Add/update a test in `src/components/provenance/DataProvenancePanel.test.tsx` (or a layer-specific
component's own test) confirming the new entry renders with the fields a reviewer would want to
see (source, classification, freshness).
