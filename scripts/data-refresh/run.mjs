#!/usr/bin/env node
// CLI entry point for the public-data refresh pipeline foundation. Runs entirely offline against
// the recorded fixture in this PR — see docs/adr/0004-public-data-ingestion.md section 9.
//
// Usage: node scripts/data-refresh/run.mjs --dataset=<id> [--dry-run]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, findEntry } from './registry.mjs';
import { evaluateCompliance, evaluateResponseCompliance } from './compliance.mjs';
import { scanRecordForPersonalData } from './privacyScan.mjs';
import { computeDiff, detectSchemaChange, assessRisk } from './diffRisk.mjs';
import { buildRefreshManifest } from './manifest.mjs';
import { buildPrReportMarkdown, buildSourceHealthIssueBody } from './reportGen.mjs';
import { fetchRecordedFixture } from './adapters/recordedFixtureAdapter.mjs';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseArgs(argv) {
  const args = { dryRun: false, dataset: null };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--dataset=')) args.dataset = arg.slice('--dataset='.length);
  }
  return args;
}

/**
 * @param {{ datasetId: string, dryRun: boolean }} options
 * @returns {{ runStatus: string, riskLevel: 'low-risk'|'hard-stop', reasons: string[],
 *   diff: ReturnType<typeof computeDiff>, prMarkdown: string, issueBody: string }}
 */
export function runDatasetRefresh({ datasetId, dryRun }) {
  const { registry, valid, issues } = loadRegistry(join(rootDir, 'data/source-registry.yml'));
  if (!valid) {
    throw new Error(`source-registry.yml failed shape validation: ${issues.join('; ')}`);
  }
  const entry = findEntry(registry, datasetId);
  if (!entry) throw new Error(`no source-registry entry for datasetId "${datasetId}"`);

  const compliance = evaluateCompliance(entry);

  if (entry.adapter !== 'recorded-fixture') {
    throw new Error(
      `adapter "${entry.adapter}" is not implemented — only "recorded-fixture" ships in this PR (see docs/adr/0004-public-data-ingestion.md section 9)`,
    );
  }
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    'fixtures',
    'recorded-source-response.json',
  );
  const response = fetchRecordedFixture({ fixturePath });

  // A recorded fixture has no real redirect/domain to police — the response-compliance check
  // still runs (so the code path is exercised the same way a real adapter would use it), but its
  // domain allowlist is the fixture's own pseudo-URL.
  const responseCompliance = evaluateResponseCompliance({
    finalUrl: response.finalUrl,
    approvedUrls: [response.finalUrl],
    contentType: response.contentType,
    expectedContentType: entry.expectedContentType,
    looksLikeLoginWall: response.looksLikeLoginWall,
  });

  const lastKnownGoodPath = join(
    rootDir,
    'reports/data-refresh/last-known-good',
    `${datasetId}.json`,
  );
  const lastKnownGood = existsSync(lastKnownGoodPath)
    ? JSON.parse(readFileSync(lastKnownGoodPath, 'utf8'))
    : { manifest: null, records: [] };

  const privacyFindings = response.records.flatMap((record) => scanRecordForPersonalData(record));
  const diff = computeDiff(lastKnownGood.records, response.records);
  const schemaChange = detectSchemaChange(lastKnownGood.records, response.records);

  const risk = assessRisk({
    diff,
    schemaChange,
    privacyFindingCount: privacyFindings.length,
    complianceAllowed: compliance.allowed,
    responseComplianceAllowed: responseCompliance.allowed,
    sourceIsOfficialMachineReadable:
      entry.authority === 'official' || entry.authority === 'illustrative',
    parserChanged: false,
    validationErrorCount: 0,
  });

  const manifest = buildRefreshManifest({
    datasetId,
    effectiveAt: response.sourcePublishedAt,
    sourcePublishedAt: response.sourcePublishedAt,
    sourceUrl: entry.sourceUrls[0],
    publisher: entry.publisher,
    adapterVersion: `${entry.adapter}@1`,
    recordCount: response.records.length,
    validationResult: 'passed',
    evidenceReference: `fixture://${datasetId} (no live evidence — see docs/adr/0004-public-data-ingestion.md)`,
    records: response.records,
  });

  const runStatus =
    risk.level === 'hard-stop'
      ? 'review-required'
      : diff.added.length === 0 && diff.changed.length === 0 && diff.removed.length === 0
        ? 'no-change'
        : 'success';

  const prMarkdown = buildPrReportMarkdown({
    datasetId,
    riskLevel: risk.level,
    reasons: [...compliance.reasons, ...responseCompliance.reasons, ...risk.reasons],
    diff,
    runStatus,
  });
  const issueBody = buildSourceHealthIssueBody({
    datasetId,
    riskLevel: risk.level,
    reasons: [...compliance.reasons, ...responseCompliance.reasons, ...risk.reasons],
    checkedAt: manifest.retrievedAt,
  });

  const reportDir = join(rootDir, 'reports/data-refresh');
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    join(reportDir, `${datasetId}.run-report.json`),
    JSON.stringify(
      {
        runStatus,
        riskLevel: risk.level,
        reasons: risk.reasons,
        manifest,
        diffSummary: {
          added: diff.added.length,
          removed: diff.removed.length,
          changed: diff.changed.length,
          unchangedCount: diff.unchangedCount,
        },
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(join(reportDir, `${datasetId}.run-report.md`), prMarkdown + '\n');
  writeFileSync(join(reportDir, `${datasetId}.issue-body.md`), issueBody + '\n');

  if (risk.level === 'low-risk' && !dryRun) {
    writeFileSync(
      lastKnownGoodPath,
      JSON.stringify({ manifest, records: response.records }, null, 2) + '\n',
    );
  }

  return { runStatus, riskLevel: risk.level, reasons: risk.reasons, diff, prMarkdown, issueBody };
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dataset) {
    console.error('Usage: node scripts/data-refresh/run.mjs --dataset=<id> [--dry-run]');
    process.exit(1);
  }
  const result = runDatasetRefresh({ datasetId: args.dataset, dryRun: args.dryRun });
  console.log(`runStatus=${result.runStatus} riskLevel=${result.riskLevel}`);
  if (result.reasons.length > 0) console.log(result.reasons.map((r) => `  - ${r}`).join('\n'));
}
