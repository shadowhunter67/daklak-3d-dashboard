# Data ingestion templates

Templates for a future internal data owner to fill in and hand to a developer to wire into
`src/data-platform/catalog/` — not something this repo consumes automatically. There is no
import/upload pipeline; adding a real dataset still means a developer adds a `DatasetDescriptor`
(and, if applicable, `IndicatorDefinition`/`IndicatorObservation`/`MapLayerDescriptor` entries) by
hand, following [docs/dataset-onboarding.md](../docs/dataset-onboarding.md).

| File                                                                      | Maps to                                                                | Notes                                                                                             |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `dataset-catalog.json`                                                    | `DatasetDescriptor` (`src/data-platform/schemas/dataset.ts`)           | One example entry — copy, don't append into the real app catalog directly.                        |
| `indicator-definitions.csv`                                               | `IndicatorDefinition` (`src/data-platform/schemas/indicator.ts`)       | One indicator per row.                                                                            |
| `indicator-observations.csv`                                              | `IndicatorObservation` (`src/data-platform/schemas/indicator.ts`)      | One observation per row; leave `value` empty for missing — never `0`.                             |
| `point-assets.geojson` / `line-assets.geojson` / `polygon-assets.geojson` | A generic asset feature shape, matching spec §10's point-asset example | For infrastructure/planning layers with real spatial data (e.g. industrial zones, project sites). |

`schemas/*.schema.json` are hand-written JSON Schema (draft-07) documents mirroring the
TypeScript types above, for validating a filled-in template before a developer copies it into the
catalog. They are **not** auto-generated from the TS source and can drift — this repo has no
build step that keeps them in sync, so update both together when either changes (see
[docs/dataset-onboarding.md](../docs/dataset-onboarding.md)).

## Deliberately excluded

No template here has a field for personal data (name-of-person, phone, ID number, address of an
individual, etc.) — these templates are for administrative/infrastructure/economic datasets, not
citizen records. If a future dataset needs personal data, it needs its own privacy review before a
template is added; don't extend these ones to carry it.

## Classification reminder

Filling in `classification` here does not, by itself, make data safe to commit to this repository.
Only `classification: "public"` data (with a genuine, checked source/license) belongs in
`src/data-platform/catalog/datasets.ts` and the static bundle — see
[docs/data-classification.md](../docs/data-classification.md). `internal`/`confidential`/
`restricted` entries are for documenting a _future_ secure-deployment dataset, not for committing
its actual content here.
