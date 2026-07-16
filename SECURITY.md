# Security policy

Pull requests receive dependency review, while a lightweight tracked-file scan rejects common private-key and provider-token patterns. The CSP is delivered through a meta tag because GitHub Pages does not expose custom response headers; it cannot provide header-only directives and is not equivalent to an HTTP CSP header.

Report vulnerabilities privately through GitHub Security Advisories for this repository. Do not open a public issue containing exploit details, credentials, or personal data. Include affected commit/version, reproduction steps, impact, and a minimal proof of concept.

The maintained version is the current `main` branch. We aim to acknowledge reports within five working days. Do not test against systems or data outside this static demo.

CI runs dependency audit, static analysis, tests, a restrictive CSP, and pinned build/deploy actions. The site processes no credentials and has no backend. Never commit secrets; revoke and rotate any accidentally exposed value before removing it from history.
