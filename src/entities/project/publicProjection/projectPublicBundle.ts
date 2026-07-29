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
import {
  buildPublicationDecisionIndex,
  computePublicationDecisionSetChecksum,
  type PublicationDecisionEntry,
  type PublicationDecisionSet,
} from './publicationDecision';

export class PublicProjectionRefusedError extends Error {}

export interface ProjectPublicBundleOptions {
  fieldAllowlist: PublicFieldAllowlist;
  /** Caller cung cấp (không gọi `new Date()` bên trong) — cùng nguyên tắc với
   * `DataQualityContext.asOf`/`ProjectPortfolioProvenance`: thời điểm là dữ liệu đến từ caller, không
   * phải side effect ẩn của hàm thuần. */
  generatedAt: string;
  /** Chuỗi tự do mô tả hệ thống sinh bundle, vd `phase6-public-projection-engine@1.0.0`. */
  producer: string;
  /** Phase 7 — publication-decision set (xem `publicationDecision.ts`) dùng để quyết định record nào
   * được public, thay cho/kết hợp với `recordClassification` tự khai. `undefined` = không dùng cơ chế
   * này (hành vi Phase 6 gốc không đổi). */
  publicationDecisions?: PublicationDecisionSet;
  /** Khi `true`: record KHÔNG có entry trong `publicationDecisions` bị LOẠI (fail-closed) thay vì mặc
   * định public. Bắt buộc `true` cho một public release THẬT (không phải demo/fixture hư cấu) — xem
   * ADR 0010. Mặc định `false` để giữ nguyên hành vi Phase 6 khi caller không truyền gì (demo/test cũ
   * không bị phá). Bật `true` mà không kèm `publicationDecisions` nghĩa là MỌI record bị loại — hợp
   * lệ về mặt logic (an toàn nhất có thể) nhưng thường là lỗi cấu hình của caller, không phải lỗi ở
   * đây; CLI (`scripts/public-projection/cli.ts`) cảnh báo rõ khi rơi vào trường hợp này. */
  requirePublicationDecisions?: boolean;
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

interface RecordClassificationResolution {
  classification: PublicRecordClassification;
  /** Có mặt khi quyết định đến từ publication-decision set (Phase 7) — dùng để viết report entry với
   * lý do/policyRule chính xác thay vì lý do chung chung "record-level classification override". */
  decisionEntry?: PublicationDecisionEntry;
  /** `true` khi record bị loại vì THIẾU quyết định dưới chế độ fail-closed (khác với bị loại vì có
   * quyết định `excluded` tường minh) — report cần phân biệt rõ hai lý do này. */
  missingRequiredDecision?: boolean;
}

/** Phase 7 (ADR 0010): khi `decisionIndex` được truyền, publication-decision set là NGUỒN SỰ THẬT
 * cho classification — được ưu tiên trên `recordClassification` tự khai (record không thể tự "khai
 * mình public" để vượt qua quyết định publication đã ký). Khi record không có entry trong decision
 * set: `requirePublicationDecisions=true` → loại (fail-closed, ADR 0010 Decision 1); `false` → rơi về
 * hành vi Phase 6 gốc (`recordClassification ?? 'public'`) — giữ nguyên tương thích ngược cho
 * demo/fixture không dùng cơ chế Phase 7. */
function resolveRecordClassification(
  record: HasOptionalRecordClassification,
  decisionIndex: ReadonlyMap<string, PublicationDecisionEntry> | undefined,
  decisionKey: string,
  requirePublicationDecisions: boolean,
): RecordClassificationResolution {
  const decisionEntry = decisionIndex?.get(decisionKey);
  if (decisionEntry) {
    return {
      classification: decisionEntry.decision === 'public' ? 'public' : 'restricted',
      decisionEntry,
    };
  }
  if (requirePublicationDecisions) {
    return { classification: 'restricted', missingRequiredDecision: true };
  }
  return { classification: record.recordClassification ?? 'public' };
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
  const decisionIndex = options.publicationDecisions
    ? buildPublicationDecisionIndex(options.publicationDecisions)
    : undefined;
  const requirePublicationDecisions = options.requirePublicationDecisions ?? false;

  // Pass 1: record-level classification filtering (publication-decision set khi có, xem ADR 0010) +
  // field allowlist, độc lập theo từng entity.
  for (const entityKind of CANONICAL_ENTITY_KINDS) {
    const sourceRecords = sourceBundle.datasets[entityKind] as unknown as Record<string, unknown>[];
    recordCountsBefore[entityKind] = sourceRecords.length;
    const allowedFields = options.fieldAllowlist.entities[entityKind];
    const survivingIds = new Set<string>();
    const projected: Record<string, unknown>[] = [];

    for (const record of sourceRecords) {
      const thisRecordId = recordId(entityKind, record);
      const resolution = resolveRecordClassification(
        record,
        decisionIndex,
        `${entityKind}:${thisRecordId}`,
        requirePublicationDecisions,
      );
      if (resolution.classification !== 'public') {
        const reason = resolution.missingRequiredDecision
          ? `Không có publication decision cho record này và requirePublicationDecisions=true (fail-closed, ADR 0010) — loại khỏi public bundle.`
          : resolution.decisionEntry
            ? `Publication decision='${resolution.decisionEntry.decision}' (decidedBy=${resolution.decisionEntry.decidedBy}, lý do: ${resolution.decisionEntry.reason}) — không xuất sang public bundle.`
            : `Record có recordClassification='${resolution.classification}' — không xuất sang public bundle.`;
        report.push({
          entityKind,
          recordId: thisRecordId,
          kind: 'record-removed',
          reason,
          classification: resolution.classification,
          policyRule: resolution.missingRequiredDecision
            ? 'publication-decision missing (fail-closed)'
            : resolution.decisionEntry
              ? 'publication-decision override'
              : 'record-level classification override',
        });
        recordRemovalCounts[entityKind] += 1;
        continue;
      }
      survivingIds.add(thisRecordId);
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
    publicationDecisionSetChecksum: options.publicationDecisions
      ? computePublicationDecisionSetChecksum(options.publicationDecisions)
      : null,
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
