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
Everything else here is guidance; this one is enforced in code —
`validateCatalog()` in `src/data-platform/validation/catalogValidation.ts` fails (and therefore
`npm test`/`quality:frontend` fails) if it's ever violated. See
[docs/data-platform-architecture.md](data-platform-architecture.md) for why this lives in Vitest
rather than a separate script.

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
