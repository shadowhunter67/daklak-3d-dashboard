/**
 * `GeneratedJsonProjectPortfolioSource` — Phase 2 (docs/project-data-import/03-importer-design.md,
 * 01-target-architecture.md §2.2). Đọc một bundle JSON đã "chuẩn hoá sẵn" (wire format tối giản —
 * xem `GeneratedProjectPortfolioBundleFile` bên dưới), KHÔNG tự parse CSV, KHÔNG fetch qua network.
 * Bundle được import tĩnh (Vite bundles vào chunk JS), giống cơ chế
 * `IllustrativeProjectPortfolioSource` — chỉ khác nguồn file. Dùng cho data mode `internal-static`
 * (xem docs/project-data-import/04-deployment-profiles-design.md).
 *
 * Fixture Phase 2 (`src/assets/data/project-portfolio.generated-fixture-demo.json`) là dữ liệu hư
 * cấu viết tay để kiểm thử adapter này — KHÔNG phải output của importer thật (Phase 4 chưa triển
 * khai). Phase 3/4 chỉ cần thay nội dung file (canonical schema đầy đủ hơn, sinh bởi importer), giữ
 * nguyên chữ ký `ProjectPortfolioSource` — component/KPI/domain không cần sửa.
 *
 * Gọi lại nguyên vẹn `validateProjectRecord`/`validateWorkPackageRecord`/`validateMilestoneRecord`/
 * `validateProjectIssueRecord`/`validateProgressSnapshotRecord` (không viết lại business rule) — nếu
 * phát hiện lỗi structural ở record, trả `status: 'degraded'` kèm `issues` (dữ liệu vẫn dùng được,
 * chỉ cần cảnh báo, đúng pattern `FakeProjectPortfolioSource.degraded()`); nếu bản thân cấu trúc
 * top-level JSON sai hình dạng, trả `status: 'error'` (`kind: 'schema-invalid'`) — KHÔNG BAO GIỜ
 * fallback âm thầm sang illustrative data (người vận hành phải biết ngay bundle generated đang lỗi,
 * không được âm thầm thấy dữ liệu minh hoạ mà tưởng là dữ liệu đã import thật).
 *
 * Sống ở `src/data/`, không phải `src/entities/project/adapters/`, cùng lý do với
 * `IllustrativeProjectPortfolioSource` (xem `projectPortfolioSource.ts`) — dù adapter này không tự
 * import GIS asset, nó vẫn là một concrete implementation, không phải type/interface thuần, nên
 * không thuộc domain layer "chỉ có type + hàm thuần" dưới `src/entities/project/`.
 */
import bundleFile from '../assets/data/project-portfolio.generated-fixture-demo.json';
import type { ProjectBundle } from '../entities/project/types';
import {
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from '../entities/project/validation/validateProject';
import type {
  ProjectPortfolioLoadResult,
  ProjectPortfolioProvenance,
  ProjectPortfolioSource,
  ProjectPortfolioSourceMetadata,
} from '../entities/project/adapters/ProjectPortfolioSource';

/**
 * Wire format tối giản Phase 2 — KHÔNG phải canonical schema đầy đủ. Xem
 * docs/project-data-import/02-canonical-schema-proposal.md §5 cho wire format mục tiêu Phase 3
 * (bao gồm agencies/contractors/evidence/referenceDocuments/auditEventsDemo mà Phase 2 chưa cần vì
 * chưa có UI/domain nào tiêu thụ các mảng đó qua nguồn generated-json).
 */
interface GeneratedProjectPortfolioBundleFile {
  schemaVersion: string;
  bundleVersion: string;
  generatedAt: string;
  asOf: string;
  sourceId: string;
  datasetIds: string[];
  validAdministrativeCodes: string[];
  provenance: Omit<ProjectPortfolioProvenance, 'loadedInBrowserAt'>;
  bundles: ProjectBundle[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Kiểm tra hình dạng top-level — KHÔNG kiểm tra sâu từng field của từng `ProjectBundle` (đó là việc
 * của `validateProjectRecord`/... gọi ngay sau bước này, xem `validateBundles`). Chỉ đủ để biết file
 * có thể coi là một `GeneratedProjectPortfolioBundleFile` một cách an toàn hay không — một type
 * guard tối thiểu, không phải một JSON Schema validator đầy đủ (đó là việc của Phase 3). */
function isPlausibleBundleFileShape(value: unknown): value is GeneratedProjectPortfolioBundleFile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.schemaVersion) &&
    isNonEmptyString(candidate.bundleVersion) &&
    isNonEmptyString(candidate.generatedAt) &&
    isNonEmptyString(candidate.asOf) &&
    isNonEmptyString(candidate.sourceId) &&
    isStringArray(candidate.datasetIds) &&
    isStringArray(candidate.validAdministrativeCodes) &&
    typeof candidate.provenance === 'object' &&
    candidate.provenance !== null &&
    Array.isArray(candidate.bundles)
  );
}

/** Gọi lại nguyên vẹn validator hiện có trên từng record — không viết lại business rule nào (xem
 * docs/project-data-import/03-importer-design.md §1, áp dụng nguyên tắc tương tự cho adapter này). */
function validateBundles(bundles: readonly ProjectBundle[]): string[] {
  const errors: string[] = [];
  for (const bundle of bundles) {
    errors.push(...validateProjectRecord(bundle.project));
    for (const workPackage of bundle.workPackages)
      errors.push(...validateWorkPackageRecord(workPackage));
    for (const milestone of bundle.milestones) errors.push(...validateMilestoneRecord(milestone));
    for (const issue of bundle.issues) errors.push(...validateProjectIssueRecord(issue));
    for (const snapshot of bundle.progressSnapshots)
      errors.push(...validateProgressSnapshotRecord(snapshot));
  }
  return errors;
}

function buildMetadata(
  file: GeneratedProjectPortfolioBundleFile | null,
): ProjectPortfolioSourceMetadata {
  return {
    sourceId: file?.sourceId ?? 'generated-json',
    sourceKind: 'generated-json',
    displayName: 'Generated JSON bundle (Phase 2 test fixture)',
    datasetIds: file?.datasetIds ?? [],
    schemaVersion: file?.schemaVersion ?? null,
    bundleVersion: file?.bundleVersion ?? null,
    asOf: file?.asOf ?? null,
    generatedAt: file?.generatedAt ?? null,
    isIllustrative: false,
    // Bundle Phase 2 chưa qua bước lọc public-projection (Phase 3/6) — chỉ tuyên bố tương thích
    // internal-static, KHÔNG tuyên bố public-static cho tới khi có cơ chế lọc thật.
    deploymentCompatibility: ['internal-static'],
  };
}

function readRawBundleFile(): unknown {
  return bundleFile;
}

export class GeneratedJsonProjectPortfolioSource implements ProjectPortfolioSource {
  getMetadata(): ProjectPortfolioSourceMetadata {
    const raw = readRawBundleFile();
    return buildMetadata(isPlausibleBundleFileShape(raw) ? raw : null);
  }

  async loadPortfolio(): Promise<ProjectPortfolioLoadResult> {
    const raw = readRawBundleFile();
    if (!isPlausibleBundleFileShape(raw)) {
      return {
        status: 'error',
        error: {
          kind: 'schema-invalid',
          message:
            'Generated JSON bundle không đúng hình dạng top-level mong đợi (thiếu hoặc sai kiểu field bắt buộc) — xem GeneratedProjectPortfolioBundleFile trong generatedJsonProjectPortfolioSource.ts.',
        },
      };
    }

    const validAdministrativeCodes = new Set(raw.validAdministrativeCodes);
    const issues = validateBundles(raw.bundles);
    const metadata = buildMetadata(raw);
    const data = {
      bundles: raw.bundles,
      validAdministrativeCodes,
      // `loadedInBrowserAt` là mốc runtime hợp lệ DUY NHẤT — các mốc còn lại đến từ bundle file,
      // không phải giờ hệ thống (cùng nguyên tắc với IllustrativeProjectPortfolioSource).
      provenance: { ...raw.provenance, loadedInBrowserAt: new Date().toISOString() },
      metadata,
    };

    if (issues.length > 0) return { status: 'degraded', data, issues };
    return { status: 'ok', data };
  }
}
