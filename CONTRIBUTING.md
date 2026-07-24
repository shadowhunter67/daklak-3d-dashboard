# Contributing

Use Node 22 and Python 3.12. Install with `npm ci` and `python -m pip install -r scripts/requirements.txt`. Read `AGENTS.md`, keep official and illustrative data visibly distinct, preserve source attribution, and avoid unrelated generated-data changes.

## Licensing terms for contributions

This repository is released under the Source-Available Evaluation License (see `LICENSE`), not an open-source license — see `LICENSE-HISTORY.md` for why and `COMMERCIAL-LICENSE.md` for commercial use.

There is no formal Contributor License Agreement (CLA) process set up yet. Until there is, **by opening a pull request against this repository you agree that the repository owner (`shadowhunter67`) may use, modify, distribute, and commercially (re)license your contribution as part of the project**, under the same terms this project itself is released under (including to future licensees under `COMMERCIAL-LICENSE.md`). If you are not willing to grant that, please do not open a pull request — a fork under your own repository is not restricted by this requirement (subject to `LICENSE` itself).

A pull request whose author has not agreed to the above will not be merged.

Before opening a pull request run:

```bash
npm run quality
npm run security:audit
```

Explain product impact, tests, data/provenance changes, visual changes, and performance-budget changes. Attach screenshots for intentional UI work. Never update snapshots, generated GIS artifacts, or budget ceilings merely to hide a regression.
