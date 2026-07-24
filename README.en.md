# Đắk Lắk 3D Dashboard

[![quality](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml)
[![Deploy GitHub Pages](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml)
[![Source available: commercial use requires a license](https://img.shields.io/badge/source--available-commercial%20use%20requires%20license-orange.svg)](LICENSE)

[Tiếng Việt](README.md) (primary, most complete) · **English** (this file — a summary, not a full translation)

A WebGL dashboard for the 102 communes/wards of Đắk Lắk province after the 2025 administrative
merger, from the former Đắk Lắk highlands to the former Phú Yên coast. The map uses an SRTM
displacement terrain surface with Sentinel-2 imagery and polygon hit-testing for hover/click/
selection. Four experiences: **Executive Overview** (default landing — portfolio KPIs, projects
needing attention, alerts, data health), the 3D overview, an accessible 2D list, and a detail map
(`?view=map`) using **MapLibre GL JS + self-hosted PMTiles** — no Google Maps Platform dependency,
no API key or billing required.

The project is transitioning from a "3D map dashboard" toward a "provincial key-project executive
platform that uses the map as a contextual layer" — see [ADR 0001](docs/adr/0001-project-centric-domain.md)
and the [domain model](docs/domain-model.md). Executive Overview, Project Portfolio, and Project
Detail currently use **deterministic illustrative data** for 9 sample projects, not real
operational figures.

## Demo

**Live demo:** https://shadowhunter67.github.io/daklak-3d-dashboard/

> **Disclaimer:** all project/work-package/milestone/budget/disbursement/issue data shown in
> Executive Overview and the map experiences is **deterministic illustrative data** (a fixed seed
> in the source code), not real operational or official government figures — it is not for actual
> management decisions, approvals, or reporting. The map is a reference visualization, not a legal
> record for land, surveying, planning, or administrative boundary purposes.

## Language / Internationalization

The UI supports **Vietnamese** (default) and **English**, switchable via the "VI / EN" control at
the top-right of the header — no page reload. The choice is reflected in a shareable URL
(`?lang=vi`/`?lang=en`, composable with any `?view=`/`#/projects...`) and remembered via
`localStorage`; Back/Forward correctly undoes/redoes the most recent language switch. See
[ADR 0003](docs/adr/0003-internationalization.md) for the full design.

**Currently translated:** the app shell, header, and the entire Executive Overview page (KPIs,
priority projects, alerts, data health, project summary dialog).

**Not yet translated** (falls back to Vietnamese by design — this is not a bug, see ADR 0003):
Project Portfolio, Project Detail, and the 3D/2D/detail map experiences. Translating those is the
recommended next phase — they involve many scattered strings across camera controls, the layer
panel, search, and measurement tools, and were deliberately scoped out of this PR rather than
translated hastily.

## Screenshot

<p align="center">
  <img src="docs/images/readme-gallery/executive-overview-desktop-en.png" alt="Executive Overview in English on desktop 1440x900: portfolio KPI cards, projects needing attention, alert list, and the ILLUSTRATIVE DATA badge" width="70%">
</p>
<p align="center"><sub>Executive Overview in English — every other screenshot in <a href="README.md">README.md</a> is in Vietnamese, the app's default and most complete language.</sub></p>

## Running the project

Requires Node.js 22. GIS artifacts are already committed, so a frontend-only contributor does not
need Python:

```bash
npm ci
npm run dev
```

Full quality gate (lint, format, typecheck, unit tests, build, budget, production E2E, plus Python
GIS validation):

```bash
npm run quality
```

See [README.md](README.md#chạy-dự-án) for the complete command reference, GIS rebuild instructions,
and output artifact list — they are not duplicated here to avoid the two files drifting apart.

## Licensing

This repository is **public but not open source**. Starting from the commit right after the
[`mit-final-1.0.0`](https://github.com/shadowhunter67/daklak-3d-dashboard/releases/tag/mit-final-1.0.0)
tag, the source is released under a **Source-Available Evaluation License** (see [LICENSE](LICENSE)):
viewing, cloning, local evaluation, learning, and non-commercial testing are permitted; commercial
use, production deployment, hosting as a service, resale, sublicensing, white-labeling, use in paid
client work, building a competing product, or redistribution are **not** — a separate written
commercial agreement is required (see [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)).

Every commit at or before `mit-final-1.0.0` remains under the MIT License it was released under —
this transition is not retroactive (see [LICENSE-HISTORY.md](LICENSE-HISTORY.md)). Third-party
dependencies and data (OpenStreetMap, Sentinel-2, SRTM, `vietnamese-provinces-database`, ...) keep
their own licenses regardless of this project's license — see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [ATTRIBUTION.md](ATTRIBUTION.md). This license
text has not been reviewed by a lawyer — see the notice in [LICENSE](LICENSE) before relying on it
for an actual commercial transaction.

## Technical documentation

See the [Tài liệu kỹ thuật](README.md#tài-liệu-kỹ-thuật) section of the Vietnamese README for the
full list of architecture, testing, performance, accessibility, data-platform, and ADR documents —
maintained in one place to avoid duplication/drift between the two READMEs.
