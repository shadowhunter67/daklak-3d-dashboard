# Internal data integration (future)

No internal/authenticated API exists for this project today — this document describes the
contract a future one would use, and what already exists in code to support it.

## Adapters

`src/data-platform/adapters/`:

- **`BundledStaticAdapter<T>`** — what every current dataset actually uses (wraps a static import).
- **`PublicHttpAdapter<T>`** — real, generic: HTTPS-only, timeout + `AbortSignal`, retries 5xx/
  network errors up to a limit (never retries 4xx), schema-validates the response, returns
  `{status: 'ok'|'degraded'|'error', ...}` rather than throwing. Not wired to any live dataset —
  no public HTTP endpoint has been verified for this project yet (see
  [docs/public-data-sources.md](public-data-sources.md)).
- **`ProtectedApiAdapter<T>`** — contract + local-mock-tested only. Takes an injected
  `AccessTokenProvider` (`getAccessToken(): Promise<string | null>`) — it never stores or refreshes
  a token itself, and never touches `localStorage`. Calls `onUnauthorized`/`onForbidden` on
  401/403 instead of throwing a generic error, and never logs the parsed response body.
- **`PmtilesSourceAdapter`** — describes a tile source's configured URL/attribution/checksum for
  the provenance UI; does not itself perform tile loading (that stays in `MapLibreProvider.ts`,
  untouched).

## What a real secure deployment needs (not built here)

1. **A BFF or API gateway** the frontend calls instead of any origin server directly — the
   frontend must never hold a long-lived credential or know a backend's real internal hostname.
2. **Session via HttpOnly cookie or a short-lived token from an identity provider SDK** — not
   `localStorage`. Implement `AccessTokenProvider` against whichever of these is chosen.
3. **Server-side authorization matching each dataset's `DataAccessPolicy`** — the frontend's
   `canViewDataset` etc. are UX-only (see [docs/data-classification.md](data-classification.md));
   the server must independently check role/classification on every request.
4. **A second deployment profile** — see [docs/deployment-profiles.md](deployment-profiles.md).
   Nothing about a secure deployment should be reachable from the public GitHub Pages build.
5. **Audit logging** — `AuditEvent` (`src/data-platform/schemas/policy.ts`) is the event shape a
   secure deployment's backend should emit (`dataset_view`/`dataset_export`/`layer_enable`/
   `access_denied`), each with a `requestId` and no PII in `note`. Nothing in this repo currently
   emits or transmits one.

## Adding a real protected dataset later

1. Add a `DatasetDescriptor` with `access.delivery: 'protected-api'`,
   `access.requiresAuthentication: true`, and `classification` per
   [docs/data-classification.md](data-classification.md).
2. Add a `DataAccessPolicy` (or reuse `confidential-standard`/`restricted-standard`) with the real
   `requiredRoles`.
3. Instantiate `ProtectedApiAdapter` with a real `AccessTokenProvider` from whatever auth mechanism
   the secure deployment uses.
4. Confirm `catalogValidationIssues` still equals `[]` (`npm test`) — this also verifies the
   dataset never accidentally gets `access.delivery: 'bundled-static'`.
5. Verify the public build (`docs/deployment-profiles.md`'s public profile) truly excludes this
   dataset before deploying anything.
