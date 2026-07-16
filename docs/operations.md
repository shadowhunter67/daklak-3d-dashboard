# Production operations

## Build and deploy

Use Node.js 22 and Python 3.12. Install locked dependencies with `npm ci`, then run `npm run quality`. A standalone production build is `npm run build`; it writes the static site and `build-info.json` to `dist/`.

Merges to `main` trigger the quality workflow. Its `build-and-budget` job creates `production-dist`; E2E tests and the Pages workflow download that exact artifact, so deployment never rebuilds unverified source. Deployment succeeds only after every quality job is green.

Verify a release by checking:

1. `quality` and `Deploy GitHub Pages` are green for the same `main` commit.
2. The live 3D view, direct `?view=2d`, selection, and one shared query-string URL work.
3. `https://shadowhunter67.github.io/daklak-3d-dashboard/build-info.json` reports the expected `gitCommit`, application version, GIS source commit, and snapshot date.
4. Browser developer tools show no failed assets or unexpected runtime errors.

## Rollback

Do not rewrite `main`. Revert the faulty merge/commit with `git revert <sha>`, open and review the resulting pull request, and merge only after quality is green. The normal workflow then deploys a newly verified artifact whose `build-info.json` identifies the revert commit. For an urgent incident, disable the Pages deployment/environment while preparing the revert; never upload an unverified local `dist` manually.

## GIS regeneration and validation

Run:

```bash
npm run prepare:gis-source
npm run build:gis
npm run build:terrain
npm run validate:data
```

`scripts/gis-source.json` pins the upstream repository, commit, source directory, and SHA-256. Preparation reuses `.cache/gis-source/repository` only after verifying both commit and deterministic directory checksum. `npm run prepare:gis-source:offline` verifies an existing cache without network access.

If checksum verification fails, do not update the expected hash merely to continue. Remove/refresh only the project cache with `python scripts/prepare_gis_source.py --refresh`, confirm the upstream commit and licensing, then retry. If GIS validation fails, inspect `reports/validation-report.json`, compare geometry/code joins/provenance with the last green commit, and treat hash changes as data changes requiring review. Do not commit partially generated artifacts.

Future official datasets must have a named owner, authoritative source URL, license/usage terms, retrieval date, effective period, source version, checksum, freshness policy, and documented transformation steps before replacing illustrative data.

## Runtime incidents

For WebGL failure, confirm the accessible 2D fallback works, try hardware acceleration/current browser drivers, and inspect context-loss messages. Repeated losses on physical devices require recording browser, GPU, OS, memory pressure, and reproduction steps; do not increase mesh/texture budgets without profiling.

For missing or corrupt textures, check the network response under the configured `/daklak-3d-dashboard/` base path, compare the deployed artifact with build metrics, and verify that the Pages run downloaded the expected `production-dist`. A 404 usually indicates an incorrect base path or incomplete artifact; a decode error warrants rebuilding from verified terrain inputs.

## Hosting, security, and observability limits

GitHub Pages is static hosting: there is no server-side authorization, dynamic API, database, runtime rollback switch, custom origin logic, or arbitrary HTTP security-header configuration. The meta CSP is useful but cannot replace a response header or enforce header-only directives. If strict CSP/security headers become mandatory, serve the same static artifact through a host/CDN that supports reviewed response-header rules.

No external telemetry or error-monitoring service is integrated. Before adding one, document purpose, data fields, retention, processor/location, consent or legal basis, opt-out behavior, access controls, and a privacy notice. Never collect selected wards, IP-derived location, or device fingerprints without an explicit product/privacy decision.
