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

## Command reference

```bash
npm run dev                      # local dev server
npm run build                    # production build, illustrative demo data (default, GitHub Pages)
npm run build:internal-static    # build against a generated-json project bundle instead of demo data
npm run build:public-static      # build against a bundle that already passed public projection
npm run test:e2e                 # Playwright against the dev server
npm run test:e2e:prod            # Playwright against a real production build
npm run check:budget             # enforce reports/performance-budget.json
npm run import:data -- --input <dir> --output <dir> --as-of <ISO date>   # offline project-data importer
npm run validate:project-data-contract   # validate a canonical bundle against the JSON Schema
```

`demo`/`internal-static`/`public-static` differ only in the **project-portfolio data source** — see
[docs/project-data-import/04-deployment-profiles-design.md](docs/project-data-import/04-deployment-profiles-design.md).
None of them use a database or backend; all are static builds. For real project-data import and the
public-projection/publication workflow, start at
[integration-kit/README.md](integration-kit/README.md) and
[docs/project-data-import/README.md](docs/project-data-import/README.md).

GIS rebuild instructions (SRTM/Sentinel-2/OSM pipeline) are in [scripts/README.md](scripts/README.md)
— most contributors never need this, since the generated GIS artifacts are already committed.
