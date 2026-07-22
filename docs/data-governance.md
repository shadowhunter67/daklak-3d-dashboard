# Data governance

Technical controls only — this document does not assert legal compliance. It exists so a human
compliance reviewer knows where to look, per Luật Dữ liệu 60/2024/QH15 (hiệu lực 1/7/2025), personal
data protection regulations, and the Luật Bảo vệ bí mật nhà nước, none of which this repository
claims to satisfy on its own.

## Rules this codebase enforces mechanically

1. **No dataset is labeled `official`/`authoritative-third-party` without a real
   `source.organization` and (where applicable) `source.sourceUrl`/`documentNumber`** — see every
   entry in `src/data-platform/catalog/datasets.ts` for the pattern.
2. **Illustrative data always carries `authority: 'illustrative'`** and is never mixed into an
   `official` indicator series without a distinguishing `status` field
   (`IndicatorObservation.status`).
3. **Province-level data cannot silently become commune-level data** — `catalogValidation.ts`
   checks every `IndicatorObservation.administrativeLevel` against its indicator's
   `allowedAdministrativeLevels`.
4. **A dataset shipped in the public static bundle must be `classification: 'public'`** — see
   [docs/data-classification.md](data-classification.md).
5. **Every dataset has a checksum or documents why it doesn't** — `catalogValidation.ts`'s
   `documentsMissingChecksum` check. Illustrative/generated demo data documents "seed-based, no
   checksum needed"; real provenance data carries the actual SHA-256 already computed by the GIS
   pipeline or the road/terrain build scripts.

## What still requires a human

- Whether any given dataset classification (`public`/`internal`/`confidential`/`restricted`)
  actually matches this project's or its future operator's legal obligations — this repo's
  classification is a technical label, not a legal determination.
- Whether the two quy hoạch document references in
  [docs/public-data-sources.md](public-data-sources.md) are being cited/used in a way that respects
  any applicable reproduction/attribution rules for government documents.
- Whether `road-network-osm-3d2d`'s and any future PMTiles source's ODbL attribution is displayed
  in every place ODbL requires (this repo believes it is — see
  [docs/detail-map-integration.md](detail-map-integration.md) and `RoadLayer2D.tsx`/
  `RoadLayer3D.tsx` — but ODbL compliance review is ultimately a human/legal judgment).
- Any future personal-data handling — no template in `data-templates/` includes personal-data
  fields on purpose (see `data-templates/README.md`); adding personal data to any dataset requires
  its own privacy review before it happens, not an extension of an existing template.

## Review process for adding a new dataset

Follow [docs/dataset-onboarding.md](dataset-onboarding.md). At minimum, before merging:

- `npm test` passes (`catalogValidationIssues` stays `[]`).
- The dataset's `classification` was chosen using [docs/data-classification.md](data-classification.md)'s
  decision order.
- If `classification !== 'public'`, confirm `access.delivery !== 'bundled-static'` — this is
  enforced in code, but a reviewer should still sanity-check _why_ a real dataset is internal
  before code review, not rely solely on the automated gate.
