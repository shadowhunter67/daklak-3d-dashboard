# Contributing

Use Node 22 and Python 3.12. Install with `npm ci` and `python -m pip install -r scripts/requirements.txt`. Read `AGENTS.md`, keep official and illustrative data visibly distinct, preserve source attribution, and avoid unrelated generated-data changes.

Before opening a pull request run:

```bash
npm run quality
npm run security:audit
```

Explain product impact, tests, data/provenance changes, visual changes, and performance-budget changes. Attach screenshots for intentional UI work. Never update snapshots, generated GIS artifacts, or budget ceilings merely to hide a regression.
