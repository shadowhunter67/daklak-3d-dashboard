# Contributing

Use Node 22 and Python 3.12. Install with `npm ci` and `python -m pip install -r scripts/requirements.txt`. Read `AGENTS.md`, keep official and illustrative data visibly distinct, preserve source attribution, and avoid unrelated generated-data changes.

## Licensing terms for contributions

This repository is released under the MIT License (see `LICENSE`) — see `LICENSE-HISTORY.md` for the project's licensing history.

By opening a pull request against this repository you agree that your contribution is licensed under the same MIT License as the rest of the project.

Before opening a pull request run:

```bash
npm run quality
npm run security:audit
```

Explain product impact, tests, data/provenance changes, visual changes, and performance-budget changes. Attach screenshots for intentional UI work. Never update snapshots, generated GIS artifacts, or budget ceilings merely to hide a regression.
