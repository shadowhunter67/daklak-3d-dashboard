# Security policy

Pull requests receive dependency review, while a lightweight tracked-file scan rejects common private-key and provider-token patterns. The CSP is delivered through a meta tag because GitHub Pages does not expose custom response headers; it cannot provide header-only directives and is not equivalent to an HTTP CSP header.

Report vulnerabilities privately through GitHub Security Advisories for this repository. Do not open a public issue containing exploit details, credentials, or personal data. Include affected commit/version, reproduction steps, impact, and a minimal proof of concept.

The maintained version is the current `main` branch. We aim to acknowledge reports within five working days. Do not test against systems or data outside this static demo.

CI runs dependency audit, static analysis, tests, a restrictive CSP, and pinned build/deploy actions. The site processes no credentials and has no backend. Never commit secrets; revoke and rotate any accidentally exposed value before removing it from history.

GitHub Pages does not allow this repository to configure arbitrary HTTP response headers such as `Content-Security-Policy`, `X-Content-Type-Options`, or `Permissions-Policy`. The current meta CSP applies supported document directives but cannot enforce header-only directives such as `frame-ancestors`. Vite emits external module scripts; the only inline allowance is `style-src 'unsafe-inline'`, required by current runtime styling dependencies. If strict response-header CSP becomes a release requirement, deploy the same static `dist` artifact through a host/CDN with configurable headers and validate it before switching traffic.

The detail map (`maplibre-gl` + `pmtiles`, see [docs/detail-map-integration.md](docs/detail-map-integration.md)) is self-hosted and same-origin by default (`connect-src 'self'` in the CSP already covers it) as long as `VITE_DETAIL_MAP_SOURCE_URL`/`VITE_TERRAIN_SOURCE_URL`/`VITE_SATELLITE_TILE_URL` stay empty or point at this same origin. If any of them is ever set to a different origin (e.g. a CDN hosting a large PMTiles file), the CSP's `connect-src` — and `img-src` if raster tiles are added — must be updated to allow that origin before deploying, or the detail map will fail to fetch its source with a CSP violation instead of the intended fallback UI. No Google Maps Platform script, tile, or API is loaded anywhere in this repository, and no API key or billing account is required to run or deploy it.
