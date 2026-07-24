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
import { evaluateAutoMergeEligibility } from './autoMergePolicy.mjs';
import { checksumOf } from './checksum.mjs';

/**
 * Best-effort identity-remap heuristic: a record in `added` whose content (minus the id field)
 * exactly matches a record in `removed` looks like the same real-world thing re-keyed under a new
 * id, not a genuine delete+add — auto-merge must not treat that as an ordinary deletion. This is a
 * heuristic, not exhaustive (a source could remap identity *and* change a field in the same run,
 * which this will miss) — see docs/adr/0004-public-data-ingestion.md section 10.
 * @param {{ added: Record<string, unknown>[], removed: Record<string, unknown>[] }} diff
 * @param {string} idField
 */
function countLikelyIdentityRemaps(diff, idField = 'id') {
  const withoutId = (record) => {
    const { [idField]: _id, ...rest } = record;
    return checksumOf(rest);
  };
  const removedContentChecksums = new Set(diff.removed.map(withoutId));
  return diff.added.filter((record) => removedContentChecksums.has(withoutId(record))).length;
}

/**
 * Best-effort legal/approval-status heuristic: any changed record whose `status` or
 * `legalStatus`/`approvalStatus` field differs between before/after. A heuristic, not a generic
 * schema-aware diff — see docs/adr/0004-public-data-ingestion.md section 10.
 * @param {{ changed: {before: Record<string, unknown>, after: Record<string, unknown>}[] }} diff
 */
function hasLegalStatusChange(diff) {
  const statusFields = ['status', 'legalStatus', 'approvalStatus'];
  return diff.changed.some(({ before, after }) =>
    statusFields.some((field) => field in before && before[field] !== after[field]),
  );
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseArgs(argv) {
  const args = { dryRun: false, dataset: null, fixtureOverride: null };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--dataset=')) args.dataset = arg.slice('--dataset='.length);
    else if (arg.startsWith('--fixture-override='))
      args.fixtureOverride = arg.slice('--fixture-override='.length);
  }
  return args;
}

/**
 * @param {{ datasetId: string, dryRun: boolean, fixtureOverridePath?: string|null }} options
 *   `fixtureOverridePath` exists only so commissioning can exercise a deliberate low-risk/hard-stop
 *   scenario against a second, purpose-built fixture file — still fully offline, never a real
 *   network source (see scripts/data-refresh/fixtures/commissioning-*.json,
 *   docs/adr/0004-public-data-ingestion.md section 10 "Live commissioning").
 * @returns {{ runStatus: string, riskLevel: 'low-risk'|'hard-stop', reasons: string[],
 *   diff: ReturnType<typeof computeDiff>, prMarkdown: string, issueBody: string,
 *   autoMergeEligible: boolean }}
 */
export function runDatasetRefresh({ datasetId, dryRun, fixtureOverridePath = null }) {
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
  const fixturePath = fixtureOverridePath
    ? join(rootDir, fixtureOverridePath)
    : join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'recorded-source-response.json');
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

  const complianceChecksum = checksumOf(entry.compliance);
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
    schemaVersion: entry.schemaVersion,
    redistributionPolicy: entry.redistributionPolicy,
    complianceChecksum,
    maturity: entry.maturity,
    records: response.records,
  });

  const previousManifest = lastKnownGood.manifest;
  const autoMerge = evaluateAutoMergeEligibility({
    maturity: entry.maturity,
    riskLevel: risk.level,
    schemaChanged: schemaChange.changed,
    adapterVersionChanged: Boolean(
      previousManifest && previousManifest.adapterVersion !== manifest.adapterVersion,
    ),
    deletionCount: diff.removed.length,
    identityRemapCount: countLikelyIdentityRemaps(diff),
    legalStatusChanged: hasLegalStatusChange(diff),
    privacyFindingCount: privacyFindings.length,
    complianceChanged: Boolean(
      previousManifest && previousManifest.complianceChecksum !== complianceChecksum,
    ),
    redistributionPolicyChanged: Boolean(
      previousManifest && previousManifest.redistributionPolicy !== entry.redistributionPolicy,
    ),
    domainRedirectAllowed: responseCompliance.allowed,
    // No external evidence-checksum store exists yet in this foundation (see ADR "Phạm vi chưa
    // làm") — there is nothing to conflict with, so this is always false until that lands.
    evidenceChecksumConflict: false,
    qualityChecksPassed: compliance.allowed && responseCompliance.allowed,
  });

  const runStatus =
    risk.level === 'hard-stop'
      ? 'review-required'
      : diff.added.length === 0 && diff.changed.length === 0 && diff.removed.length === 0
        ? 'no-change'
        : 'success';

  const allReasons = [...compliance.reasons, ...responseCompliance.reasons, ...risk.reasons];
  const prMarkdown = buildPrReportMarkdown({
    datasetId,
    riskLevel: risk.level,
    reasons: allReasons,
    diff,
    runStatus,
    maturity: entry.maturity,
    autoMergeEligible: autoMerge.eligible,
    autoMergeReasons: autoMerge.reasons,
  });
  const issueBody = buildSourceHealthIssueBody({
    datasetId,
    riskLevel: risk.level,
    reasons: allReasons,
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
        maturity: entry.maturity,
        autoMergeEligible: autoMerge.eligible,
        autoMergeReasons: autoMerge.reasons,
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

  const hasLastKnownGoodChange = !(
    diff.added.length === 0 &&
    diff.changed.length === 0 &&
    diff.removed.length === 0
  );

  if (risk.level === 'low-risk' && !dryRun) {
    writeFileSync(
      lastKnownGoodPath,
      JSON.stringify({ manifest, records: response.records }, null, 2) + '\n',
    );
  }

  // Machine-readable run outcome the GitHub Actions workflow reads with `jq`/Node — never grep
  // console output for this (docs/adr/0004-public-data-ingestion.md section 10 "workflow
  // robustness"). One file per run (not per-dataset) is enough because the workflow only ever
  // refreshes one dataset per job.
  writeFileSync(
    join(reportDir, 'run-result.json'),
    JSON.stringify(
      {
        datasetId,
        runStatus,
        riskLevel: risk.level,
        maturity: entry.maturity,
        autoMergeEligible: autoMerge.eligible,
        hasLastKnownGoodChange,
        dryRun,
      },
      null,
      2,
    ) + '\n',
  );

  if (!dryRun)
    writeGeneratedSourceHealth({
      rootDir,
      registry,
      run: { datasetId, entry, risk, manifest, autoMerge },
    });

  return {
    runStatus,
    riskLevel: risk.level,
    reasons: risk.reasons,
    diff,
    prMarkdown,
    issueBody,
    autoMergeEligible: autoMerge.eligible,
  };
}

/**
 * Regenerates the canonical, generated source-health snapshot for every source in the registry
 * from the same run's manifest — never hand-edited (docs/adr/0004-public-data-ingestion.md section
 * 10 "Generated source health"). `DataSourcesPanel` reads only this file. For datasets this run
 * didn't touch, carries forward whatever the existing snapshot said about them (each dataset is
 * refreshed on its own schedule — a run for dataset A must not blank out dataset B's last-known
 * state).
 * @param {{ rootDir: string, registry: unknown, run: { datasetId: string, entry: object, risk: object, manifest: object, autoMerge: { eligible: boolean, reasons: string[] } } }} input
 */
function writeGeneratedSourceHealth({ rootDir, registry, run }) {
  const outPath = join(rootDir, 'data/published/source-health.json');
  const outDir = dirname(outPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const existing = existsSync(outPath)
    ? JSON.parse(readFileSync(outPath, 'utf8'))
    : { sources: [] };
  const bySourceId = new Map(existing.sources.map((source) => [source.datasetId, source]));

  const consecutiveFailures =
    run.risk.level === 'hard-stop'
      ? (bySourceId.get(run.datasetId)?.consecutiveFailures ?? 0) + 1
      : 0;
  const now = new Date().toISOString();
  const lastSuccessfulAt =
    run.risk.level === 'low-risk' ? now : (bySourceId.get(run.datasetId)?.lastSuccessfulAt ?? null);
  const lastPublishedAt =
    run.risk.level === 'low-risk'
      ? run.manifest.retrievedAt
      : (bySourceId.get(run.datasetId)?.lastPublishedAt ?? null);

  bySourceId.set(run.datasetId, {
    datasetId: run.datasetId,
    publisher: run.entry.publisher,
    sourceUrl: run.entry.sourceUrls[0],
    attribution: run.entry.attribution,
    staleAfterDays: run.entry.staleAfterDays,
    recordCount: run.manifest.recordCount,
    maturity: run.entry.maturity,
    isRecordedFixture: run.entry.acquisitionType === 'recorded-fixture',
    availability: run.risk.level === 'hard-stop' ? 'degraded' : 'available',
    lastCheckedAt: now,
    lastSuccessfulAt,
    lastPublishedAt,
    consecutiveFailures,
    freshness: lastPublishedAt ? 'published' : 'never-published',
    publishedChecksum: run.manifest.checksum,
    status: run.risk.level,
    // Reasons never carry a raw regex match or response body — only the same masked/summarized
    // strings already surfaced in the PR/issue reports (compliance.mjs, privacyScan.mjs).
    warnings: run.autoMerge.reasons,
  });

  // Any other registered source this run didn't touch (own schedule, not yet run at all) still
  // gets an entry — the panel must be able to list every declared source, not just the one that
  // happened to run most recently.
  for (const source of registry?.sources ?? []) {
    if (bySourceId.has(source.datasetId)) continue;
    bySourceId.set(source.datasetId, {
      datasetId: source.datasetId,
      publisher: source.publisher,
      sourceUrl: source.sourceUrls?.[0] ?? null,
      attribution: source.attribution,
      staleAfterDays: source.staleAfterDays,
      recordCount: null,
      maturity: source.maturity,
      isRecordedFixture: source.acquisitionType === 'recorded-fixture',
      availability: 'unknown',
      lastCheckedAt: null,
      lastSuccessfulAt: null,
      lastPublishedAt: null,
      consecutiveFailures: 0,
      freshness: 'never-published',
      publishedChecksum: null,
      status: 'not-yet-run',
      warnings: [],
    });
  }

  const snapshot = { generatedAt: now, sources: [...bySourceId.values()] };
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n');

  // The browser bundle only ever imports from src/assets (Vite's project root) — this file is a
  // generated mirror of the canonical data/published/source-health.json above, never hand-edited,
  // kept in sync in the same pipeline run so there is exactly one source of truth for its content.
  const bundledPath = join(rootDir, 'src/assets/data/data-refresh-source-health.json');
  writeFileSync(bundledPath, JSON.stringify(snapshot, null, 2) + '\n');
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dataset) {
    console.error('Usage: node scripts/data-refresh/run.mjs --dataset=<id> [--dry-run]');
    process.exit(1);
  }
  const result = runDatasetRefresh({
    datasetId: args.dataset,
    dryRun: args.dryRun,
    fixtureOverridePath: args.fixtureOverride,
  });
  // Human-readable console summary only — the workflow reads reports/data-refresh/run-result.json
  // via jq, never parses this line (docs/adr/0004-public-data-ingestion.md section 10 "workflow
  // robustness": no grep-of-stdout parsing).
  console.log(`runStatus=${result.runStatus} riskLevel=${result.riskLevel}`);
  if (result.reasons.length > 0) console.log(result.reasons.map((r) => `  - ${r}`).join('\n'));
}
