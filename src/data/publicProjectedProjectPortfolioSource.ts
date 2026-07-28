/**
 * `PublicProjectedProjectPortfolioSource` — Phase 6. Đối xứng với `GeneratedJsonProjectPortfolioSource`
 * (generatedJsonProjectPortfolioSource.ts) nhưng đọc bundle ĐÃ qua public projection engine
 * (`src/entities/project/publicProjection/`, chạy offline qua `npm run project:public-data` +
 * `npm run stage:public-portfolio`) — KHÔNG tự chạy projection ở đây (B1: "Không làm projection
 * trong browser runtime"). File này CỐ TÌNH KHÔNG import bất kỳ thứ gì từ
 * `src/entities/project/publicProjection/projectPublicBundle.ts` — chỉ đọc hai JSON đã sinh sẵn, để
 * projection engine (và các dependency Node-only gián tiếp của nó) không lọt vào browser bundle.
 *
 * Validate lại giống hệt `GeneratedJsonProjectPortfolioSource` (shape guard tối thiểu + domain record
 * validation, KHÔNG viết lại rule) — bundle public dù đã qua projection vẫn phải là canonical bundle
 * hợp lệ.
 */
import labels from '../assets/maps/daklak/daklak-labels.json';
import bundleFile from '../assets/data/project-portfolio.public-projected.json';
import manifestFile from '../assets/data/project-portfolio.public-projection-manifest.json';
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

function isPlausibleProjectionManifestShape(
  value: unknown,
): value is { projectionVersion: string; generatedAt: string; allowedFieldPolicyVersion: string } {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.projectionVersion) &&
    isNonEmptyString(value.generatedAt) &&
    isNonEmptyString(value.allowedFieldPolicyVersion)
  );
}

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

function readRawBundleFile(): unknown {
  return bundleFile;
}

function readRawManifestFile(): unknown {
  return manifestFile;
}

function buildMetadata(
  bundle: CanonicalProjectPortfolioBundle | null,
): ProjectPortfolioSourceMetadata {
  const manifest = readRawManifestFile();
  return {
    sourceId: 'public-projected',
    sourceKind: 'public-projected',
    displayName: 'Public projected bundle (Phase 6 — allowlist-filtered)',
    datasetIds: bundle?.metadata.sourceDatasetIds ?? [],
    schemaVersion: bundle?.schemaVersion ?? null,
    bundleVersion: bundle?.bundleVersion ?? null,
    asOf: bundle?.metadata.asOf ?? null,
    generatedAt: bundle?.metadata.generatedAt ?? null,
    isIllustrative: false,
    deploymentCompatibility: ['public-static'],
    publicProjectionManifest: isPlausibleProjectionManifestShape(manifest)
      ? {
          projectionVersion: manifest.projectionVersion,
          generatedAt: manifest.generatedAt,
          allowedFieldPolicyVersion: manifest.allowedFieldPolicyVersion,
        }
      : null,
  };
}

const validAdministrativeCodes = new Set(Object.keys(labels));

export class PublicProjectedProjectPortfolioSource implements ProjectPortfolioSource {
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
            'Public-projected bundle không đúng hình dạng canonical top-level mong đợi — xem CanonicalProjectPortfolioBundle trong src/entities/project/canonicalBundle.ts.',
        },
      };
    }
    if (!isSupportedCanonicalSchemaVersion(raw.schemaVersion)) {
      return {
        status: 'error',
        error: {
          kind: 'unsupported-schema-version',
          message: `Public-projected bundle có schemaVersion '${raw.schemaVersion}' không được hỗ trợ.`,
        },
      };
    }
    if (raw.metadata.classification !== 'public') {
      return {
        status: 'error',
        error: {
          kind: 'schema-invalid',
          message: `Bundle được stage vào vị trí public-static nhưng metadata.classification='${raw.metadata.classification}' — từ chối load để tránh phục vụ dữ liệu chưa qua public projection.`,
        },
      };
    }

    const bundles = groupCanonicalDatasetsIntoProjectBundles(raw.datasets);
    const issues = validateBundles(bundles);
    const metadata = buildMetadata(raw);
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
