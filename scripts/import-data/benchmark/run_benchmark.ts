#!/usr/bin/env -S node
/**
 * `npm run benchmark:import-data` — Phase 5 §A3. Benchmark deterministic, KHÔNG dùng dữ liệu thật,
 * KHÔNG đặt ngưỡng thời gian cứng trong CI (spec "không đặt ngưỡng thời gian CI dễ flaky nếu chưa có
 * baseline ổn định") — chỉ IN kết quả để người vận hành tự đọc/so sánh qua thời gian. CI chỉ chạy
 * smoke test riêng (`run_benchmark.test.ts`, quy mô nhỏ, không so ngưỡng ms tuyệt đối).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { groupCanonicalDatasetsIntoProjectBundles } from '../../../src/entities/project/canonicalBundleMapper';
import {
  CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION,
  type CanonicalProjectPortfolioBundle,
} from '../../../src/entities/project/canonicalBundle';
import {
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from '../../../src/entities/project/validation/validateProject';
import {
  runDataQualityRules,
  type DataQualityContext,
} from '../../../src/entities/project/validation/dataQualityRules';
import { summarizeDataQuality } from '../../../src/entities/project/dataQualitySummary';
import {
  compileCanonicalBundleValidator,
  validateAgainstCanonicalSchema,
} from '../schemaValidation';
import { validateCanonicalReferentialIntegrity } from '../canonicalIntegrity';
import { generateSyntheticDatasets } from './generateSyntheticDataset';

function resolveRepoRoot(): string {
  try {
    return resolve(fileURLToPath(new URL('../../..', import.meta.url)));
  } catch {
    return process.cwd();
  }
}

export interface BenchmarkResult {
  projectCount: number;
  timingsMs: {
    writeAndReadJson: number;
    schemaValidation: number;
    mapper: number;
    domainValidation: number;
    crossRecordValidation: number;
    total: number;
  };
  heapUsedDeltaBytes: number;
  bundleBytes: number;
  sizeReport: ReturnType<typeof generateSyntheticDatasets>['sizeReport'];
}

export function runBenchmarkForSize(projectCount: number, repoRoot: string): BenchmarkResult {
  const heapBefore = process.memoryUsage().heapUsed;
  const totalStart = performance.now();

  const { datasets, sizeReport } = generateSyntheticDatasets(projectCount);
  const bundle: CanonicalProjectPortfolioBundle = {
    schemaVersion: CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION,
    bundleVersion: `benchmark-${projectCount}`,
    metadata: {
      generatedAt: '2026-01-01T00:00:00.000Z',
      asOf: '2026-01-01T00:00:00.000Z',
      sourceDatasetIds: ['project-portfolio-illustrative'],
      administrativeCodeVersion: 'benchmark',
      classification: 'internal',
      producer: 'benchmark',
    },
    datasets,
  };

  const tempDir = mkdtempSync(join(tmpdir(), 'importer-benchmark-'));
  const jsonPath = join(tempDir, 'bundle.json');
  const serialized = JSON.stringify(bundle);
  writeFileSync(jsonPath, serialized, 'utf8');

  const readStart = performance.now();
  const parsedBundle = JSON.parse(
    readFileSync(jsonPath, 'utf8'),
  ) as CanonicalProjectPortfolioBundle;
  const writeAndReadJson = performance.now() - readStart;

  const schemaStart = performance.now();
  const validate = compileCanonicalBundleValidator(repoRoot);
  validateAgainstCanonicalSchema(validate, parsedBundle);
  const schemaValidation = performance.now() - schemaStart;

  const mapperStart = performance.now();
  const bundles = groupCanonicalDatasetsIntoProjectBundles(parsedBundle.datasets);
  const mapper = performance.now() - mapperStart;

  const domainStart = performance.now();
  for (const b of bundles) {
    validateProjectRecord(b.project);
    for (const wp of b.workPackages) validateWorkPackageRecord(wp);
    for (const ms of b.milestones) validateMilestoneRecord(ms);
    for (const iss of b.issues) validateProjectIssueRecord(iss);
    for (const snap of b.progressSnapshots) validateProgressSnapshotRecord(snap);
  }
  const domainValidation = performance.now() - domainStart;

  const crossStart = performance.now();
  validateCanonicalReferentialIntegrity(parsedBundle.datasets);
  const context: DataQualityContext = {
    validAdministrativeCodes: new Set(['22015']),
    agencies: parsedBundle.datasets.agencies,
    contractors: parsedBundle.datasets.contractors,
    evidence: parsedBundle.datasets.evidence,
    asOf: new Date('2026-01-01T00:00:00.000Z'),
  };
  runDataQualityRules(bundles, context);
  summarizeDataQuality(bundles, context);
  const crossRecordValidation = performance.now() - crossStart;

  const total = performance.now() - totalStart;
  const heapAfter = process.memoryUsage().heapUsed;

  rmSync(tempDir, { recursive: true, force: true });

  return {
    projectCount,
    timingsMs: {
      writeAndReadJson,
      schemaValidation,
      mapper,
      domainValidation,
      crossRecordValidation,
      total,
    },
    heapUsedDeltaBytes: heapAfter - heapBefore,
    bundleBytes: Buffer.byteLength(serialized, 'utf8'),
    sizeReport,
  };
}

function formatResult(result: BenchmarkResult): string {
  const t = result.timingsMs;
  return [
    `projects=${result.projectCount}`,
    `workPackages=${result.sizeReport.workPackageCount}`,
    `milestones=${result.sizeReport.milestoneCount}`,
    `snapshots=${result.sizeReport.progressSnapshotCount}`,
    `bundleBytes=${result.bundleBytes}`,
    `parse=${t.writeAndReadJson.toFixed(1)}ms`,
    `schema=${t.schemaValidation.toFixed(1)}ms`,
    `mapper=${t.mapper.toFixed(1)}ms`,
    `domain=${t.domainValidation.toFixed(1)}ms`,
    `crossRecord=${t.crossRecordValidation.toFixed(1)}ms`,
    `total=${t.total.toFixed(1)}ms`,
    `heapDelta=${(result.heapUsedDeltaBytes / 1024 / 1024).toFixed(1)}MiB`,
  ].join(' ');
}

export async function main(argv: readonly string[]): Promise<number> {
  const sizesFlagIndex = argv.indexOf('--sizes');
  const sizes =
    sizesFlagIndex >= 0 ? argv[sizesFlagIndex + 1].split(',').map(Number) : [25, 250, 1000];
  const repoRoot = resolveRepoRoot();

  console.log('Importer synthetic benchmark (deterministic, no real data):');
  const results: BenchmarkResult[] = [];
  for (const size of sizes) {
    const result = runBenchmarkForSize(size, repoRoot);
    results.push(result);
    console.log(`  ${formatResult(result)}`);
  }

  const outputFlagIndex = argv.indexOf('--output');
  if (outputFlagIndex >= 0) {
    writeFileSync(argv[outputFlagIndex + 1], `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  }
  return 0;
}

function isRunningAsScript(): boolean {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}
if (isRunningAsScript()) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
