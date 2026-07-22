# Data classification

Four tiers (`DataClassification` in `src/data-platform/schemas/dataset.ts`), each with one
standard `DataAccessPolicy` in `src/data-platform/policies/defaultPolicies.ts`:

| Tier           | Bundle in public build? | Requires auth? | Cache client-side?  | Export?             | Notes                                                                                                                             |
| -------------- | ----------------------- | -------------- | ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `public`       | Yes                     | No             | Yes                 | Yes                 | Attribution/provenance must be shown ([docs/public-data-sources.md](public-data-sources.md))                                      |
| `internal`     | **Never**               | Yes            | No (default policy) | No (default policy) | Not indexed, not client-logged                                                                                                    |
| `confidential` | Never                   | Yes + role     | No                  | No                  | Minimal data return; never in analytics; `minimumAggregationLevel` allowed                                                        |
| `restricted`   | Never                   | Yes + role     | No                  | No                  | Not designed for public static deployment at all — interface/docs only, per [docs/deployment-profiles.md](deployment-profiles.md) |

## The one invariant that matters most

**A dataset with `access.delivery: 'bundled-static'` must have `classification: 'public'`.**
Everything else here is guidance; this one is enforced in code in two independent layers:

1. **In-catalog**: `validateCatalog()` in `src/data-platform/validation/catalogValidation.ts` fails
   (and therefore `npm test`/`quality:frontend` fails) if a _registered_ dataset ever violates it.
   See [docs/data-platform-architecture.md](data-platform-architecture.md) for why this lives in
   Vitest rather than a separate script.
2. **Bypass-the-catalog boundary**: `npm run validate:public-build` (source) and
   `npm run validate:public-build:dist` (built output) — `scripts/validate_public_build.mjs` —
   catch the case catalogValidation.ts structurally cannot: a developer importing a non-public
   JSON file, or a forbidden path (`/internal/`, `/confidential/`, `/restricted/`, `/protected/`,
   `data-templates/`), directly into `src/`, bypassing the catalog entirely. The dist-mode scan
   also greps the _actual built bundle_ for private hostnames, credential-shaped query params,
   JWT/Bearer tokens, and any dataset id the source-side manifest (written by `npm test`) says is
   non-public. See [docs/security-architecture.md](security-architecture.md#public-data-leakage-boundary).

## Evidence level vs. verification status

For `DocumentReference` (`src/data-platform/schemas/dataset.ts`), two independent axes matter and
must not be collapsed into one:

- **`verificationStatus`** (`verified` | `research-needed`) — did _anyone actually check_ this
  citation's title/number/date/authority/URL?
- **`evidenceLevel`** (`DocumentEvidenceLevel`) — _how strong_ is what was checked:
  - `official-primary-document` — the signed instrument itself, hosted on the issuing authority's
    own document portal (e.g. `vanban.chinhphu.vn`, not a legal-database aggregator).
  - `official-publication-reference` — an official announcement/news page _about_ the document,
    without a link to the signed file itself.
  - `authoritative-secondary-reference` — a reputable third party citing the document.
  - `unverified` — default when `evidenceLevel` is omitted.

A document can be `verified` while only reaching `official-publication-reference` — verification
doesn't retroactively strengthen the evidence you actually looked at. See the two Đắk Lắk planning
decisions in [docs/public-data-sources.md](public-data-sources.md) for both cases side by side.

## Identity vs. geometry vs. metric authority

A single `authority` field overstates or understates the truth whenever a dataset's name/code,
geometry, and values come from genuinely different sources — the administrative-units dataset is
the running example: names/codes trace to a real Nghị quyết/Quyết định (`official`), but the
polygon shapes come from an open-community GitHub repo. `DatasetAuthorityDetail`
(`identityAuthority`/`geometryAuthority`/`metricAuthority`) lets a dataset express this; the
provenance UI shows the detailed breakdown instead of the coarse `authority` fallback whenever it's
present (see `DataProvenancePanel.tsx`'s `AuthorityFields`).

## Frontend guards are UX, not security

`canViewDataset`/`canExportDataset`/`canCacheDataset`
(`src/data-platform/policies/accessPolicy.ts`) decide what the _UI_ shows — they cannot stop
someone from reading the JavaScript bundle or replaying a network request. Any dataset that
actually needs protection must never be shipped in the public static bundle in the first place;
real enforcement is a server's job (see [docs/deployment-profiles.md](deployment-profiles.md) and
[docs/security-architecture.md](security-architecture.md)). Today, with no backend and no login,
every real visitor is `ANONYMOUS_PUBLIC_USER` (`accessPolicy.ts`) — there is no other user context
in this repository.

## Choosing a classification for a new dataset

Ask, in order:

1. Would this data embarrass, harm, or create liability for someone if anyone on the internet
   could read it forever? → `restricted` or `confidential`.
2. Is it operational/internal-only but not sensitive to individuals (e.g. draft figures before
   official publication)? → `internal`.
3. Is it already published by an authority, or synthetic/illustrative and clearly labeled as such?
   → `public`.

When unsure, classify stricter and downgrade later — the leakage guard only ever blocks a
`bundled-static` + non-public combination, so an overly strict classification never breaks the
public build; it just keeps a dataset out until someone deliberately marks it public.
