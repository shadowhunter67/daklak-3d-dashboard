/**
 * `GeneratedJsonProjectPortfolioSource` — Phase 3 (docs/project-data-import/, ADR 0006). Đọc một
 * CANONICAL bundle JSON (`CanonicalProjectPortfolioBundle`,
 * `src/entities/project/canonicalBundle.ts`) — thay thế wire format tạm thời Phase 2
 * (`GeneratedProjectPortfolioBundleFile`, dataset-oriented nông cạn không versioned) bằng canonical
 * schema đầy đủ, versioned, có JSON Schema mirror
 * (`data-templates/schemas/project-portfolio-bundle.schema.json`).
 *
 * Luồng (docs/project-data-import/03-importer-design.md, cập nhật Phase 3):
 *   canonical JSON → structural shape guard (nhẹ, KHÔNG chạy Ajv trong browser — xem "Option A" bên
 *   dưới) → kiểm tra schemaVersion được hỗ trợ → transport-to-domain mapping
 *   (`groupCanonicalDatasetsIntoProjectBundles`) → domain record validation (`validateProject.ts`,
 *   không viết lại) → `ProjectPortfolioLoadResult`.
 *
 * **Option A (build-time validated bundle)**: Ajv/JSON Schema KHÔNG được import ở file này (không
 * đi vào browser production bundle) — full JSON Schema validation chạy ở
 * `npm run validate:project-data-contract` (Node tooling, `scripts/validate_project_data_contract.mjs`)
 * trên chính file `project-portfolio.generated-fixture-demo.json`, TRƯỚC KHI build. Runtime ở đây
 * chỉ làm một type-guard tối thiểu (đủ để không throw khi truy cập field) + kiểm tra
 * `schemaVersion` nằm trong allowlist hỗ trợ — không phải một JSON Schema validator đầy đủ.
 *
 * KHÔNG BAO GIỜ fallback âm thầm sang illustrative data khi bundle lỗi (schema-invalid hoặc
 * unsupported-schema-version) — người vận hành phải biết ngay build `internal-static` đang lỗi.
 *
 * Sống ở `src/data/`, không phải `src/entities/project/adapters/`, cùng lý do với
 * `IllustrativeProjectPortfolioSource` (concrete implementation, không phải type/interface thuần).
 */
import labels from '../assets/maps/daklak/daklak-labels.json';
import bundleFile from '../assets/data/project-portfolio.generated-fixture-demo.json';
import {
  isSupportedCanonicalSchemaVersion,
  type CanonicalProjectPortfolioBundle,
} from '../entities/project/canonicalBundle';
import { groupCanonicalDatasetsIntoProjectBundles } from '../entities/project/canonicalBundleMapper';
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
  ProjectPortfolioSource,
  ProjectPortfolioSourceMetadata,
} from '../entities/project/adapters/ProjectPortfolioSource';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard tối thiểu — KHÔNG phải JSON Schema validator đầy đủ (đó là việc của
 * `validate_project_data_contract.mjs`, chạy build-time). Chỉ đủ để biết bundle có hình dạng
 * top-level an toàn để truy cập field hay không.
 */
function isPlausibleCanonicalBundleShape(value: unknown): value is CanonicalProjectPortfolioBundle {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.schemaVersion) || !isNonEmptyString(value.bundleVersion))
    return false;
  if (!isPlainObject(value.metadata) || !isPlainObject(value.datasets)) return false;
  const metadata = value.metadata;
  if (
    !isNonEmptyString(metadata.generatedAt) ||
    !isNonEmptyString(metadata.asOf) ||
    !isNonEmptyString(metadata.administrativeCodeVersion) ||
    !isNonEmptyString(metadata.classification) ||
    !isNonEmptyString(metadata.producer) ||
    !Array.isArray(metadata.sourceDatasetIds)
  )
    return false;
  const datasets = value.datasets;
  return (
    Array.isArray(datasets.agencies) &&
    Array.isArray(datasets.contractors) &&
    Array.isArray(datasets.projects) &&
    Array.isArray(datasets.workPackages) &&
    Array.isArray(datasets.milestones) &&
    Array.isArray(datasets.projectIssues) &&
    Array.isArray(datasets.progressSnapshots) &&
    Array.isArray(datasets.evidence) &&
    Array.isArray(datasets.referenceDocuments)
  );
}

/** Gọi lại nguyên vẹn validator hiện có trên từng record — không viết lại business rule nào (xem
 * docs/project-data-import/03-importer-design.md §1). */
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
  bundle: CanonicalProjectPortfolioBundle | null,
): ProjectPortfolioSourceMetadata {
  return {
    sourceId: 'generated-json',
    sourceKind: 'generated-json',
    displayName: 'Generated JSON bundle (Phase 3 canonical, test fixture)',
    datasetIds: bundle?.metadata.sourceDatasetIds ?? [],
    schemaVersion: bundle?.schemaVersion ?? null,
    bundleVersion: bundle?.bundleVersion ?? null,
    asOf: bundle?.metadata.asOf ?? null,
    generatedAt: bundle?.metadata.generatedAt ?? null,
    isIllustrative: false,
    // Bundle Phase 3 chưa qua bước lọc public-projection (Phase 6) — chỉ tuyên bố tương thích
    // internal-static, KHÔNG public-static, cho tới khi có cơ chế lọc thật.
    deploymentCompatibility: ['internal-static'],
  };
}

function readRawBundleFile(): unknown {
  return bundleFile;
}

/** Nguồn thật DUY NHẤT cho mã hành chính hợp lệ — cùng file `IllustrativeProjectPortfolioSource`
 * dùng (xem `src/data/projectPortfolioSource.ts`). Canonical bundle KHÔNG tự mang danh sách mã hành
 * chính riêng (xem JSDoc `src/entities/project/canonicalBundle.ts` — lý do tránh hai nguồn sự thật
 * có thể lệch nhau); `metadata.administrativeCodeVersion` chỉ là một khai báo tham chiếu phiên bản,
 * không phải bản thân dữ liệu. */
const validAdministrativeCodes = new Set(Object.keys(labels));

export class GeneratedJsonProjectPortfolioSource implements ProjectPortfolioSource {
  getMetadata(): ProjectPortfolioSourceMetadata {
    const raw = readRawBundleFile();
    return buildMetadata(isPlausibleCanonicalBundleShape(raw) ? raw : null);
  }

  async loadPortfolio(): Promise<ProjectPortfolioLoadResult> {
    const raw = readRawBundleFile();
    if (!isPlausibleCanonicalBundleShape(raw)) {
      return {
        status: 'error',
        error: {
          kind: 'schema-invalid',
          message:
            'Generated JSON bundle không đúng hình dạng canonical top-level mong đợi — xem CanonicalProjectPortfolioBundle trong src/entities/project/canonicalBundle.ts.',
        },
      };
    }

    if (!isSupportedCanonicalSchemaVersion(raw.schemaVersion)) {
      return {
        status: 'error',
        error: {
          kind: 'unsupported-schema-version',
          message: `Generated JSON bundle có schemaVersion '${raw.schemaVersion}' không được hỗ trợ — xem SUPPORTED_CANONICAL_SCHEMA_VERSIONS trong canonicalBundle.ts. Không parse "best-effort" một version chưa hỗ trợ.`,
        },
      };
    }

    const bundles = groupCanonicalDatasetsIntoProjectBundles(raw.datasets);
    const issues = validateBundles(bundles);
    const metadata = buildMetadata(raw);
    // Bốn mốc của ProjectPortfolioProvenance ánh xạ từ hai field canonical metadata sẵn có (asOf,
    // generatedAt) — canonical bundle Phase 3 chưa có 4 mốc tách biệt như fixture minh hoạ viết tay
    // (xem docs/project-data-import/02-canonical-schema-proposal.md, "Metadata tối thiểu" không liệt
    // kê 4 field này). Đây là giản lược có chủ đích, không phải bịa giá trị khác nhau giả tạo —
    // effectiveAt/sourcePublishedAt cùng dùng `asOf`; retrievedAt/publishedToDashboardAt cùng dùng
    // `generatedAt`, vì bundle generated-json không phân biệt hai cặp khái niệm này ở Phase 3.
    const data = {
      bundles,
      validAdministrativeCodes,
      provenance: {
        effectiveAt: raw.metadata.asOf,
        sourcePublishedAt: raw.metadata.asOf,
        retrievedAt: raw.metadata.generatedAt,
        publishedToDashboardAt: raw.metadata.generatedAt,
        loadedInBrowserAt: new Date().toISOString(),
      },
      metadata,
    };

    if (issues.length > 0) return { status: 'degraded', data, issues };
    return { status: 'ok', data };
  }
}
