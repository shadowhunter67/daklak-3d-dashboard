/**
 * Public projection engine (Phase 6 — docs/project-data-import/public-projection-policy.md). Hàm
 * THUẦN, build-time/offline: biến một `CanonicalProjectPortfolioBundle` internal thành bundle
 * public-safe theo field allowlist (`config/public-project-fields.json`). KHÔNG chạy trong browser —
 * chỉ được gọi từ `scripts/public-projection/cli.ts` (Node) và test; không adapter phía browser nào
 * (`src/data/publicProjectedProjectPortfolioSource.ts`) được import module này — adapter chỉ đọc
 * OUTPUT JSON đã sinh sẵn, không tự chạy projection lúc runtime (xem B1 trong spec Phase 6).
 *
 * Không mutate `sourceBundle` — luôn dựng object/mảng mới (xem test "input không bị mutate", B8).
 * Cùng input (bundle + policy + `PROJECTION_ENGINE_VERSION`) phải luôn cho cùng
 * `projectedContentChecksum` — `generatedAt` KHÔNG được đưa vào phép tính checksum (B7).
 */
import {
  CANONICAL_ENTITY_KINDS,
  type CanonicalBundleClassification,
  type CanonicalEntityKind,
  type CanonicalProjectPortfolioBundle,
  type CanonicalProjectPortfolioDatasets,
} from '../canonicalBundle';
import { computeNormalizedContentChecksum } from './deterministicChecksum';
import type {
  HasOptionalRecordClassification,
  ProjectionCountsByEntity,
  ProjectionManifest,
  ProjectionReport,
  ProjectionReportEntry,
  PublicFieldAllowlist,
  PublicRecordClassification,
} from './publicProjectionTypes';
import { PROJECTION_ENGINE_VERSION } from './publicProjectionTypes';

export class PublicProjectionRefusedError extends Error {}

export interface ProjectPublicBundleOptions {
  fieldAllowlist: PublicFieldAllowlist;
  /** Caller cung cấp (không gọi `new Date()` bên trong) — cùng nguyên tắc với
   * `DataQualityContext.asOf`/`ProjectPortfolioProvenance`: thời điểm là dữ liệu đến từ caller, không
   * phải side effect ẩn của hàm thuần. */
  generatedAt: string;
  /** Chuỗi tự do mô tả hệ thống sinh bundle, vd `phase6-public-projection-engine@1.0.0`. */
  producer: string;
}

export interface ProjectPublicBundleResult {
  bundle: CanonicalProjectPortfolioBundle;
  manifest: ProjectionManifest;
  report: ProjectionReport;
}

/** Bundle-level classification nào thì TỪ CHỐI toàn bộ việc projection (không có field nào đủ an
 * toàn để cân nhắc) — khác `restricted`/`internal` ở mức RECORD (field-allowlist vẫn xử lý được).
 * `restricted` theo docs/deployment-profiles.md: "not designed for public static deployment at all".
 * `confidential` tương đương ở mức bundle. */
const BUNDLE_CLASSIFICATIONS_REFUSING_PROJECTION: readonly CanonicalBundleClassification[] = [
  'restricted',
  'confidential',
];

function emptyCounts(): ProjectionCountsByEntity {
  const counts = {} as ProjectionCountsByEntity;
  for (const kind of CANONICAL_ENTITY_KINDS) counts[kind] = 0;
  return counts;
}

function recordId(entityKind: CanonicalEntityKind, record: Record<string, unknown>): string {
  if (entityKind === 'progressSnapshots') {
    return `${String(record.projectId)}::${String(record.observedAt)}::${String(record.sourceDatasetId)}`;
  }
  return String(record.id ?? '(unknown-id)');
}

/** Record-level classification hiện KHÔNG tồn tại trong canonical JSON Schema (Phase 3-5) — field
 * `recordClassification` chỉ là một optional TypeScript-level hook dự phòng (xem JSDoc
 * `publicProjectionTypes.ts`). Mặc định khi vắng mặt là `'public'` (không tự loại record) — an toàn
 * thực sự nằm ở FIELD-level allowlist bên dưới (field không nằm trong allowlist luôn bị loại, kể cả
 * khi record được coi là 'public'). Đây là điểm khác biệt có chủ đích với B3 "missing classification
 * → fail/exclude": ở mức FIELD, "thiếu trong allowlist" ĐÃ tương đương "loại trừ" — hai lớp phòng thủ
 * độc lập (record-level tuỳ chọn + field-level bắt buộc) cộng lại, không phải một lớp duy nhất mặc
 * định "thiếu = public". */
function resolveRecordClassification(
  record: HasOptionalRecordClassification,
): PublicRecordClassification {
  return record.recordClassification ?? 'public';
}

function projectRecordFields(
  entityKind: CanonicalEntityKind,
  record: Record<string, unknown>,
  allowedFields: readonly string[],
  report: ProjectionReportEntry[],
): Record<string, unknown> {
  const allowedSet = new Set(allowedFields);
  const projected: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in record && record[field] !== undefined) projected[field] = record[field];
  }
  for (const field of Object.keys(record)) {
    if (allowedSet.has(field)) continue;
    if (record[field] === undefined) continue;
    report.push({
      entityKind,
      recordId: recordId(entityKind, record),
      kind: 'field-removed',
      fieldName: field,
      reason: `Field '${field}' không nằm trong public field allowlist (policyVersion ${allowedFields.length ? 'đã khai báo' : '(entity rỗng)'}) của entity '${entityKind}'.`,
      classification: 'internal',
      policyRule: `public-project-fields.json#entities.${entityKind}`,
    });
  }
  return projected;
}

export function projectCanonicalBundleToPublic(
  sourceBundle: CanonicalProjectPortfolioBundle,
  options: ProjectPublicBundleOptions,
): ProjectPublicBundleResult {
  if (BUNDLE_CLASSIFICATIONS_REFUSING_PROJECTION.includes(sourceBundle.metadata.classification)) {
    throw new PublicProjectionRefusedError(
      `Bundle nguồn có classification '${sourceBundle.metadata.classification}' — không được phép chạy public projection trên bundle này dù chỉ để lọc field (xem docs/deployment-profiles.md: '${sourceBundle.metadata.classification}' không thiết kế cho public static deployment).`,
    );
  }

  const report: ProjectionReportEntry[] = [];
  const recordCountsBefore = emptyCounts();
  const recordCountsAfter = emptyCounts();
  const fieldRemovalCounts = emptyCounts();
  const recordRemovalCounts = emptyCounts();

  const survivingIdsByEntity = {} as Record<CanonicalEntityKind, Set<string>>;
  const projectedDatasets = {} as Record<CanonicalEntityKind, Record<string, unknown>[]>;

  // Pass 1: record-level classification filtering + field allowlist, độc lập theo từng entity.
  for (const entityKind of CANONICAL_ENTITY_KINDS) {
    const sourceRecords = sourceBundle.datasets[entityKind] as unknown as Record<string, unknown>[];
    recordCountsBefore[entityKind] = sourceRecords.length;
    const allowedFields = options.fieldAllowlist.entities[entityKind];
    const survivingIds = new Set<string>();
    const projected: Record<string, unknown>[] = [];

    for (const record of sourceRecords) {
      const classification = resolveRecordClassification(record);
      if (classification !== 'public') {
        report.push({
          entityKind,
          recordId: recordId(entityKind, record),
          kind: 'record-removed',
          reason: `Record có recordClassification='${classification}' — không xuất sang public bundle.`,
          classification,
          policyRule: 'record-level classification override',
        });
        recordRemovalCounts[entityKind] += 1;
        continue;
      }
      survivingIds.add(recordId(entityKind, record));
      const before = report.length;
      const projectedRecord = projectRecordFields(entityKind, record, allowedFields, report);
      fieldRemovalCounts[entityKind] += report.length - before;
      projected.push(projectedRecord);
    }

    survivingIdsByEntity[entityKind] = survivingIds;
    projectedDatasets[entityKind] = projected;
  }

  // Pass 2: cascade — record con của một project đã bị loại cũng phải bị loại (FK không được hỏng).
  const survivingProjectIds = survivingIdsByEntity.projects;
  for (const childKind of [
    'workPackages',
    'milestones',
    'projectIssues',
    'progressSnapshots',
  ] as const) {
    const before = projectedDatasets[childKind].length;
    projectedDatasets[childKind] = projectedDatasets[childKind].filter((child) => {
      const projectId = String(child.projectId);
      const keep = survivingProjectIds.has(projectId);
      if (!keep) {
        report.push({
          entityKind: childKind,
          recordId: recordId(childKind, child),
          kind: 'record-removed',
          reason: `Project cha (projectId=${projectId}) đã bị loại khỏi public bundle — loại theo cascade để không hỏng foreign key.`,
          classification: 'internal',
          policyRule: 'cascade: parent project removed',
        });
        recordRemovalCounts[childKind] += 1;
      }
      return keep;
    });
    recordCountsAfter[childKind] = projectedDatasets[childKind].length;
    void before;
  }
  recordCountsAfter.projects = projectedDatasets.projects.length;
  recordCountsAfter.agencies = projectedDatasets.agencies.length;
  recordCountsAfter.contractors = projectedDatasets.contractors.length;
  recordCountsAfter.evidence = projectedDatasets.evidence.length;
  recordCountsAfter.referenceDocuments = projectedDatasets.referenceDocuments.length;

  // Pass 3: orphan reference pruning — projectIssues.evidenceIds trỏ tới evidence đã bị loại phải
  // được cắt khỏi mảng (nội dung field, không phải xoá cả record issue) để không còn FK hỏng.
  const survivingEvidenceIds = survivingIdsByEntity.evidence;
  projectedDatasets.projectIssues = projectedDatasets.projectIssues.map((issue) => {
    const evidenceIds = Array.isArray(issue.evidenceIds) ? (issue.evidenceIds as string[]) : [];
    const prunedEvidenceIds = evidenceIds.filter((id) => survivingEvidenceIds.has(id));
    if (prunedEvidenceIds.length === evidenceIds.length) return issue;
    report.push({
      entityKind: 'projectIssues',
      recordId: recordId('projectIssues', issue),
      kind: 'field-removed',
      fieldName: 'evidenceIds',
      reason:
        'Một hoặc nhiều evidenceId trỏ tới evidence đã bị loại khỏi public bundle — đã cắt khỏi mảng để không hỏng foreign key.',
      classification: 'internal',
      policyRule: 'orphan-reference-pruning: evidenceIds',
    });
    return { ...issue, evidenceIds: prunedEvidenceIds };
  });

  const outputDatasets = projectedDatasets as unknown as CanonicalProjectPortfolioDatasets;

  const outputBundle: CanonicalProjectPortfolioBundle = {
    schemaVersion: sourceBundle.schemaVersion,
    bundleVersion: sourceBundle.bundleVersion,
    metadata: {
      generatedAt: options.generatedAt,
      asOf: sourceBundle.metadata.asOf,
      sourceDatasetIds: sourceBundle.metadata.sourceDatasetIds,
      administrativeCodeVersion: sourceBundle.metadata.administrativeCodeVersion,
      classification: 'public',
      producer: options.producer,
      description: `Public projection của bundle nguồn (producer gốc: '${sourceBundle.metadata.producer}') qua public-projection-engine v${PROJECTION_ENGINE_VERSION}, field policy v${options.fieldAllowlist.policyVersion}. Xem docs/project-data-import/public-projection-policy.md.`,
    },
    datasets: outputDatasets,
  };

  const sourceNormalizedContentChecksum = computeNormalizedContentChecksum(sourceBundle.datasets);
  const projectedContentChecksum = computeNormalizedContentChecksum(outputDatasets);

  const manifest: ProjectionManifest = {
    projectionVersion: PROJECTION_ENGINE_VERSION,
    schemaVersion: sourceBundle.schemaVersion,
    sourceBundleVersion: sourceBundle.bundleVersion,
    generatedAt: options.generatedAt,
    sourceNormalizedContentChecksum,
    projectedContentChecksum,
    allowedFieldPolicyVersion: options.fieldAllowlist.policyVersion,
    recordCountsBefore,
    recordCountsAfter,
    fieldRemovalCounts,
    recordRemovalCounts,
    sourceDatasetIds: sourceBundle.metadata.sourceDatasetIds,
    outputDatasetIds: sourceBundle.metadata.sourceDatasetIds.map((id) => `${id}-public-projected`),
  };

  return {
    bundle: outputBundle,
    manifest,
    report: {
      projectionVersion: PROJECTION_ENGINE_VERSION,
      generatedAt: options.generatedAt,
      entries: report,
    },
  };
}
