# Deployment profiles

Two profiles are named by the spec this data platform follows: `public` and `secure`. Only
`public` is actually built and deployed by this repository today
(`.github/workflows/*` → GitHub Pages, unchanged by this work). `secure` is documented as a target
shape — its interfaces exist in code, but no second build target, CI job, or hosting environment
was created in this pass, per the explicit scope decision in this feature's plan.

## Public profile (this repo, as shipped)

- Built by the existing `npm run build` / `quality:frontend` pipeline — unchanged.
- Contains only `classification: 'public'` datasets — enforced by `catalogValidationIssues` _and_
  `scripts/validate_public_build.mjs` (source + dist scans, both cross-checking every physical data
  file against its exact-path entry in `config/public-data-files.json`; see
  [docs/data-classification.md](data-classification.md) and
  [docs/security-architecture.md](security-architecture.md#public-data-leakage-boundary)).
- No `ProtectedApiAdapter` instance is ever constructed with a real token provider in this profile
  — nothing in the app currently instantiates one at all; the source-scan step specifically checks
  that `ProtectedApiAdapter.ts` isn't even reachable from `src/main.tsx`.
- No login, no session, no secret, no private endpoint.
- `DetailMapViewport` and `DataProvenancePanel` are separate lazy chunks — a visitor who never
  opens the detail map or the provenance panel never downloads their code, only the tiny
  `provenancePanelOpen` boolean in the always-loaded store (see
  [docs/data-platform-architecture.md](data-platform-architecture.md#lazy-loading)).

## Secure profile (not built — target shape only)

What exists today to support a future secure deployment:

- **Runtime configuration contract**: none formalized beyond Vite's existing `VITE_*` env vars
  (`.env.example`). A real secure deployment would need its own config surface (e.g. a runtime
  `window.__CONFIG__` injected by the serving infrastructure, since static env vars are baked in at
  build time and a secure deployment likely needs per-environment values without rebuilding).
- **Auth provider interface**: `AccessTokenProvider` (`src/data-platform/adapters/ProtectedApiAdapter.ts`)
  — a real implementation (BFF session cookie, OIDC SDK, etc.) plugs in here.
- **Role-aware catalog**: `DataAccessPolicy.requiredRoles` + `canViewDataset` already model this;
  a secure deployment's UI would filter `DATASET_CATALOG`/`LAYER_REGISTRY` through
  `canViewDataset(realUserContext, dataset, policy)` instead of always using
  `ANONYMOUS_PUBLIC_USER`.
- **Protected API adapter**: `ProtectedApiAdapter` — contract + local-mock tests only, see
  [docs/internal-data-integration.md](internal-data-integration.md).
- **Audit event interface**: `AuditEvent` (`src/data-platform/schemas/policy.ts`) — no emitter
  exists; a secure deployment's backend (not this frontend) should be the one actually writing
  audit logs, with the frontend at most triggering an event via an authenticated API call.

## What a secure deployment still needs before it could exist

1. A BFF/API gateway (see [docs/internal-data-integration.md](internal-data-integration.md)) — this
   frontend cannot safely hold credentials itself.
2. A separate hosting environment with network access controls — GitHub Pages cannot host this;
   it's static-only with no compute and no custom headers.
3. Real identity provider integration.
4. A CI/CD pipeline for that environment, separate from the `quality`/`Deploy GitHub Pages`
   workflows this repo already has for the public profile.
5. A build-time (or better, runtime) check equivalent to today's public-leakage guard, but inverted
   for its own purposes — e.g. failing if a `restricted` dataset were ever bundled into _that_
   profile's static assets, if it has any.

None of this is implemented in this pass — building real infrastructure without a concrete secure
deployment to run it on would be exactly the kind of premature, undirected work `AGENTS.md` warns
against.
