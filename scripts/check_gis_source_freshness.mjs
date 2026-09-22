// Checks how close the pinned OSM PBF snapshot (scripts/osm-pbf-source.json) is to Geofabrik's
// ~90-day retention window (see its own retentionNote) — the concrete failure mode is that
// npm run build:gis's download step 404s once Geofabrik deletes the dated file, and nobody
// notices until someone happens to try a rebuild. This script never runs as part of the build or
// the `quality` gate; it only backs the scheduled reminder workflow
// (.github/workflows/gis-source-freshness.yml), so it always exits 0 and reports its finding as
// JSON instead of failing.
//
// gis-source.json (the vietnamese-provinces-database admin-boundary snapshot) has no published
// retention window — its upstream repo doesn't delete old commits — so it's reported for
// visibility only, never flagged as at-risk.

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const GEOFABRIK_RETENTION_DAYS = 90;
// Flag it with enough lead time for someone to notice a weekly scheduled run and act before the
// URL actually goes 404.
const WARN_WITHIN_DAYS_OF_EXPIRY = 15;

function daysBetween(fromIso, toDate) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((toDate.getTime() - from.getTime()) / msPerDay);
}

async function readJson(relativePath) {
  const raw = await readFile(join(root, relativePath), 'utf-8');
  return JSON.parse(raw);
}

async function main() {
  const now = new Date();

  const osmSource = await readJson('scripts/osm-pbf-source.json');
  const gisSource = await readJson('scripts/gis-source.json');

  const osmAgeDays = daysBetween(osmSource.extractDate, now);
  const osmDaysRemaining = GEOFABRIK_RETENTION_DAYS - osmAgeDays;
  const osmStale = osmDaysRemaining <= WARN_WITHIN_DAYS_OF_EXPIRY;

  const gisAgeDays = daysBetween(gisSource.snapshotDate, now);

  const report = {
    checkedAt: now.toISOString(),
    osmPbf: {
      extractDate: osmSource.extractDate,
      fileName: osmSource.fileName,
      ageDays: osmAgeDays,
      retentionDays: GEOFABRIK_RETENTION_DAYS,
      daysRemaining: osmDaysRemaining,
      stale: osmStale,
    },
    adminBoundaries: {
      snapshotDate: gisSource.snapshotDate,
      ageDays: gisAgeDays,
      // No known retention window upstream — reported for visibility, never flagged stale.
      stale: false,
    },
    stale: osmStale,
  };

  await mkdir(join(root, 'reports'), { recursive: true });
  await writeFile(
    join(root, 'reports', 'gis-source-freshness.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  console.log(
    osmStale
      ? `STALE: OSM PBF snapshot (${osmSource.extractDate}) has ${osmDaysRemaining} day(s) left before Geofabrik's ~${GEOFABRIK_RETENTION_DAYS}-day retention window closes. Re-pin scripts/osm-pbf-source.json (see scripts/prepare_osm_pbf.py) and rebuild the detail-map PMTiles.`
      : `OK: OSM PBF snapshot (${osmSource.extractDate}) has ${osmDaysRemaining} day(s) left before Geofabrik's ~${GEOFABRIK_RETENTION_DAYS}-day retention window closes.`,
  );
  console.log(
    `Admin boundary snapshot (${gisSource.snapshotDate}) is ${gisAgeDays} day(s) old — no known upstream expiry.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
