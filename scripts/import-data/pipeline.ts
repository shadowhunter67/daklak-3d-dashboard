/**
 * Import pipeline orchestration — Phase 4 (ADR 0007). Thứ tự BẮT BUỘC theo spec Phase 4:
 *   discover input → read raw bytes → checksum source files → parse transport → normalize fields →
 *   assemble canonical bundle → schema-version gate → JSON Schema validation →
 *   map canonical datasets to domain bundles → record validation →
 *   cross-record validation/data-quality → generate reports → decide blocking status.
 * Không viết lại mapper/domain validator/quality rule/snapshot-selection nào ở đây — chỉ orchestrate.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  Agency,
  Contractor,
  Evidence,
  Milestone,
  ProgressSnapshot,
  Project,
  ProjectBundle,
  ProjectIssue,
  ReferenceDocument,
  WorkPackage,
} from '../../src/entities/project/types';
import {
  CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION,
  type CanonicalBundleMetadata,
  type CanonicalProjectPortfolioBundle,
  type CanonicalProjectPortfolioDatasets,
} from '../../src/entities/project/canonicalBundle';
import { groupCanonicalDatasetsIntoProjectBundles } from '../../src/entities/project/canonicalBundleMapper';
import {
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from '../../src/entities/project/validation/validateProject';
import {
  runDataQualityRules,
  type DataQualityContext,
} from '../../src/entities/project/validation/dataQualityRules';
import {
  summarizeDataQuality,
  type DataQualitySummary,
} from '../../src/entities/project/dataQualitySummary';
import type { ImportIssue, ImporterErrorCode } from './errorCodes';
import { checksumFile, readUtf8FileStrict } from './fileReading';
import {
  computeInputPackageChecksum,
  computeNormalizedContentChecksum,
  type ChecksummedSourceFile,
} from './checksum';
import { readCsvDirectory } from './csvDatasets';
import {
  checkSchemaVersionSupported,
  isPlausibleCanonicalBundleShape,
  parseJsonBundle,
} from './jsonInput';
import {
  compileCanonicalBundleValidator,
  validateAgainstCanonicalSchema,
} from './schemaValidation';
import { loadAdministrativeCodes } from './administrativeCodes';
import { loadLocalSourceRegistryIds, resolveDatasetIds } from './sourceRegistry';

export type InputFormat = 'json' | 'csv';

export interface PipelineOptions {
  repoRoot: string;
  inputPath: string;
  format: 'auto' | InputFormat;
  asOf: string;
  strict: boolean;
  administrativeCodesPath: string;
  sourceRegistryPath?: string;
  importerVersion: string;
}

export interface PipelineResult {
  resolvedFormat: InputFormat;
  canonicalBundle: CanonicalProjectPortfolioBundle | null;
  bundles: ProjectBundle[];
  issues: ImportIssue[];
  blocking: boolean;
  sourceFiles: ChecksummedSourceFile[];
  inputPackageChecksum: string;
  normalizedContentChecksum: string | null;
  administrativeCodeVersion: string;
  administrativeCodeChecksum: string;
  qualitySummary: DataQualitySummary | null;
  qualityIssues: import('../../src/entities/project/types').DataQualityIssue[];
}

function asRecords<T>(records: readonly Record<string, unknown>[]): T[] {
  return records as unknown as T[];
}

const QUALITY_RULE_TO_CODE: Record<string, ImporterErrorCode> = {
  'duplicate-primary-key': 'duplicate-primary-key',
  'dangling-project-reference': 'foreign-key-unresolved',
  'dangling-work-package-reference': 'foreign-key-unresolved',
  'unknown-contractor': 'foreign-key-unresolved',
  'unknown-managing-authority': 'foreign-key-unresolved',
  'unknown-investor': 'foreign-key-unresolved',
  'unknown-evidence': 'foreign-key-unresolved',
  'unmapped-administrative-code': 'administrative-code-unresolved',
  'stale-data': 'business-stale-data',
  'multiple-verification-stage-records': 'business-multiple-verification-stage',
};

/** JSON mode: một file `.json` duy nhất. CSV mode: một directory. Từ chối directory trong JSON mode
 * và ngược lại (spec "Từ chối directory trong JSON mode"). `auto` suy ra từ filesystem entry type —
 * không đoán theo phần mở rộng tên file. */
export function resolveInputFormat(
  inputPath: string,
  requested: 'auto' | InputFormat,
): InputFormat {
  if (!existsSync(inputPath)) {
    throw new PipelineConfigError('input-not-found', `Input không tồn tại: ${inputPath}`);
  }
  const stat = statSync(inputPath);
  const actual: InputFormat = stat.isDirectory() ? 'csv' : 'json';
  if (requested !== 'auto' && requested !== actual) {
    throw new PipelineConfigError(
      'cli-invalid-argument',
      `--format=${requested} nhưng input thực tế là ${actual === 'json' ? 'một file' : 'một thư mục'} (${inputPath}).`,
    );
  }
  return actual;
}

export class PipelineConfigError extends Error {
  constructor(
    public readonly code: ImporterErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * `groupCanonicalDatasetsIntoProjectBundles` (Phase 3, không viết lại) nhóm workPackages/milestones/
 * projectIssues/progressSnapshots THEO `datasets.projects` — một record có `projectId` không khớp
 * bất kỳ project nào bị loại khỏi MỌI `ProjectBundle` (không lỗi, không cảnh báo ở tầng mapper). Hệ
 * quả: `dangling-project-reference` trong `dataQualityRules.ts` không bao giờ tự bắt được orphan
 * thật (nó chỉ chạy trên record đã nằm trong một bundle, tức projectId đã khớp) — đây là một
 * integrity check RIÊNG của importer (không phải viết lại mapper/quality-rule), bù đúng khoảng
 * trống record bị mapper âm thầm bỏ qua trước khi chúng biến mất. Xem ADR 0007 quyết định
 * "orphan reference check".
 */
function checkOrphanedProjectReferences(
  datasets: CanonicalProjectPortfolioDatasets,
): ImportIssue[] {
  const projectIds = new Set(datasets.projects.map((p) => p.id));
  const issues: ImportIssue[] = [];
  const check = (
    dataset: string,
    records: readonly { projectId: string }[],
    idOf: (r: { projectId: string }) => string,
  ) => {
    for (const record of records) {
      if (!projectIds.has(record.projectId))
        issues.push({
          code: 'foreign-key-unresolved',
          severity: 'error',
          layer: 'quality',
          dataset,
          recordId: idOf(record),
          message: `projectId không tồn tại trong datasets.projects: ${record.projectId}`,
        });
    }
  };
  check('workPackages', datasets.workPackages, (r) => (r as unknown as { id: string }).id);
  check('milestones', datasets.milestones, (r) => (r as unknown as { id: string }).id);
  check('projectIssues', datasets.projectIssues, (r) => (r as unknown as { id: string }).id);
  check(
    'progressSnapshots',
    datasets.progressSnapshots,
    (r) => `${r.projectId}@${(r as unknown as { observedAt: string }).observedAt}`,
  );
  return issues;
}

function collectSourceDatasetIds(datasets: CanonicalProjectPortfolioDatasets): Set<string> {
  const ids = new Set<string>();
  const collect = (value: { sourceDatasetId?: string } | undefined) => {
    if (value?.sourceDatasetId) ids.add(value.sourceDatasetId);
  };
  datasets.agencies.forEach(collect);
  datasets.contractors.forEach(collect);
  datasets.projects.forEach((p) => ids.add(p.sourceDatasetId));
  datasets.workPackages.forEach(collect);
  datasets.milestones.forEach(collect);
  datasets.projectIssues.forEach((i) => ids.add(i.sourceDatasetId));
  datasets.progressSnapshots.forEach((s) => ids.add(s.sourceDatasetId));
  datasets.evidence.forEach(collect);
  datasets.referenceDocuments.forEach(collect);
  return ids;
}

/** Deterministic, KHÔNG dùng Date.now() cho phần business — chỉ dựa trên `asOf` (input vận hành) và
 * nội dung đã chuẩn hoá. Xem docs/project-data-import/schema-versioning-policy.md: bundleVersion
 * không bao giờ là timestamp chạy. */
function computeBundleVersion(asOf: string, normalizedContentChecksum: string): string {
  const datePart = asOf.slice(0, 10);
  return `${datePart}-${normalizedContentChecksum.slice(0, 12)}`;
}

export function runImportPipeline(options: PipelineOptions): PipelineResult {
  const issues: ImportIssue[] = [];
  const resolvedFormat = resolveInputFormat(options.inputPath, options.format);
  const sourceFiles: ChecksummedSourceFile[] = [];

  const adminCodes = loadAdministrativeCodes(options.administrativeCodesPath);
  const localRegistryIds = loadLocalSourceRegistryIds(options.sourceRegistryPath);

  let canonicalBundle: CanonicalProjectPortfolioBundle | null = null;

  if (resolvedFormat === 'json') {
    const relativePath = 'input.json';
    const read = readUtf8FileStrict(options.inputPath, relativePath);
    if (!read.ok) {
      issues.push(read.issue);
    } else {
      sourceFiles.push(checksumFile(relativePath, read.bytes));
      const parsed = parseJsonBundle(read.content, relativePath);
      if (!parsed.ok) {
        issues.push(parsed.issue);
      } else if (!isPlausibleCanonicalBundleShape(parsed.bundle)) {
        issues.push({
          code: 'schema-invalid',
          severity: 'error',
          layer: 'schema',
          file: relativePath,
          message:
            'Bundle JSON không đúng hình dạng canonical top-level (schemaVersion/bundleVersion/datasets) — xem CanonicalProjectPortfolioBundle.',
        });
      } else {
        const versionIssue = checkSchemaVersionSupported(parsed.bundle.schemaVersion);
        if (versionIssue) issues.push(versionIssue);
        else canonicalBundle = parsed.bundle as CanonicalProjectPortfolioBundle;
      }
    }
  } else {
    const csvFileNames = readdirSync(options.inputPath).filter((f) =>
      f.toLowerCase().endsWith('.csv'),
    );
    for (const fileName of csvFileNames) {
      const filePath = join(options.inputPath, fileName);
      const read = readUtf8FileStrict(filePath, fileName);
      if (!read.ok) {
        issues.push(read.issue);
        continue;
      }
      sourceFiles.push(checksumFile(fileName, read.bytes));
    }
    const csvResult = readCsvDirectory(options.inputPath, options.strict);
    issues.push(...csvResult.issues);
    for (const dataset of csvResult.datasets) issues.push(...dataset.issues);

    const byKey = new Map(csvResult.datasets.map((d) => [d.datasetKey, d.records]));
    const datasets: CanonicalProjectPortfolioDatasets = {
      agencies: asRecords<Agency>(byKey.get('agencies') ?? []),
      contractors: asRecords<Contractor>(byKey.get('contractors') ?? []),
      projects: asRecords<Project>(byKey.get('projects') ?? []),
      workPackages: asRecords<WorkPackage>(byKey.get('workPackages') ?? []),
      milestones: asRecords<Milestone>(byKey.get('milestones') ?? []),
      projectIssues: asRecords<ProjectIssue>(byKey.get('projectIssues') ?? []),
      progressSnapshots: asRecords<ProgressSnapshot>(byKey.get('progressSnapshots') ?? []),
      evidence: asRecords<Evidence>(byKey.get('evidence') ?? []),
      referenceDocuments: asRecords<ReferenceDocument>(byKey.get('referenceDocuments') ?? []),
    };

    const normalizedContentChecksum = computeNormalizedContentChecksum(datasets);
    const metadata: CanonicalBundleMetadata = {
      generatedAt: new Date().toISOString(),
      asOf: options.asOf,
      sourceDatasetIds: [...collectSourceDatasetIds(datasets)].sort(),
      administrativeCodeVersion: adminCodes.version,
      classification: 'internal',
      producer: `phase4-importer@${options.importerVersion}`,
    };
    canonicalBundle = {
      schemaVersion: CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION,
      bundleVersion: computeBundleVersion(options.asOf, normalizedContentChecksum),
      metadata,
      datasets,
    };
  }

  const inputPackageChecksum = computeInputPackageChecksum(sourceFiles);
  let normalizedContentChecksum: string | null = null;
  let bundles: ProjectBundle[] = [];
  let qualityIssues: import('../../src/entities/project/types').DataQualityIssue[] = [];
  let qualitySummary: DataQualitySummary | null = null;

  if (canonicalBundle) {
    normalizedContentChecksum = computeNormalizedContentChecksum(canonicalBundle.datasets);

    const validate = compileCanonicalBundleValidator(options.repoRoot);
    issues.push(...validateAgainstCanonicalSchema(validate, canonicalBundle));

    bundles = groupCanonicalDatasetsIntoProjectBundles(canonicalBundle.datasets);

    for (const bundle of bundles) {
      for (const message of validateProjectRecord(bundle.project))
        issues.push({
          code: 'domain-invalid',
          severity: 'error',
          layer: 'domain',
          dataset: 'projects',
          recordId: bundle.project.id,
          message,
        });
      for (const wp of bundle.workPackages)
        for (const message of validateWorkPackageRecord(wp))
          issues.push({
            code: 'domain-invalid',
            severity: 'error',
            layer: 'domain',
            dataset: 'workPackages',
            recordId: wp.id,
            message,
          });
      for (const ms of bundle.milestones)
        for (const message of validateMilestoneRecord(ms))
          issues.push({
            code: 'domain-invalid',
            severity: 'error',
            layer: 'domain',
            dataset: 'milestones',
            recordId: ms.id,
            message,
          });
      for (const iss of bundle.issues)
        for (const message of validateProjectIssueRecord(iss))
          issues.push({
            code: 'domain-invalid',
            severity: 'error',
            layer: 'domain',
            dataset: 'projectIssues',
            recordId: iss.id,
            message,
          });
      for (const snap of bundle.progressSnapshots)
        for (const message of validateProgressSnapshotRecord(snap))
          issues.push({
            code: 'domain-invalid',
            severity: 'error',
            layer: 'domain',
            dataset: 'progressSnapshots',
            recordId: `${snap.projectId}@${snap.observedAt}`,
            message,
          });
    }

    const context: DataQualityContext = {
      validAdministrativeCodes: adminCodes.codes,
      agencies: canonicalBundle.datasets.agencies,
      contractors: canonicalBundle.datasets.contractors,
      evidence: canonicalBundle.datasets.evidence,
      asOf: new Date(options.asOf),
    };
    issues.push(...checkOrphanedProjectReferences(canonicalBundle.datasets));
    qualityIssues = runDataQualityRules(bundles, context);
    for (const q of qualityIssues)
      issues.push({
        code: QUALITY_RULE_TO_CODE[q.rule] ?? 'domain-invalid',
        severity: q.severity,
        layer:
          q.rule === 'stale-data' || q.rule === 'multiple-verification-stage-records'
            ? 'business'
            : 'quality',
        dataset: q.entityType,
        recordId: q.entityId,
        message: q.message,
      });
    qualitySummary = summarizeDataQuality(bundles, context);

    issues.push(
      ...resolveDatasetIds(
        collectSourceDatasetIds(canonicalBundle.datasets),
        localRegistryIds,
        options.strict,
      ),
    );
  }

  const blocking = issues.some((i) => i.severity === 'error');

  return {
    resolvedFormat,
    canonicalBundle,
    bundles,
    issues,
    blocking,
    sourceFiles,
    inputPackageChecksum,
    normalizedContentChecksum,
    administrativeCodeVersion: adminCodes.version,
    administrativeCodeChecksum: adminCodes.checksum,
    qualitySummary,
    qualityIssues,
  };
}

export function resolveRepoRoot(fromDir: string): string {
  return resolve(fromDir);
}
