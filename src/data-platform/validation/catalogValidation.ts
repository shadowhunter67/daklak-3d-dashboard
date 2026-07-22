/**
 * Build/test-time invariants for the dataset/indicator/layer catalog — the TypeScript-level
 * equivalent of scripts/validate_daklak_data.py for GIS artifacts, following the same pattern as
 * src/data/datasetManifest.ts's `validateDatasetArtifacts`/`datasetManifestIssues`: a pure function
 * that takes explicit inputs (unit-testable with synthetic bad data) plus a module-level constant
 * that runs it against the real catalog so a real violation shows up in `npm test` immediately.
 *
 * This is also where the "public bundle never references non-public data" invariant lives (spec
 * §6/§11) — deliberately a Vitest check rather than a new scripts/*.mjs Node script: every other
 * *.mjs script in this repo (check_build_budget.mjs, check_secrets.mjs) operates on already-built
 * dist/ output or plain-text file scanning, not on parsed TypeScript source, and this repo has no
 * ts-node/tsx runtime to let a plain Node script import catalog/datasets.ts directly. Reusing
 * `npm test` (already part of quality:frontend) gives the same CI guarantee without adding a new
 * dependency just to run this one check outside Vitest.
 */
import type { DatasetDescriptor } from '../schemas/dataset';
import type { IndicatorDefinition, IndicatorObservation } from '../schemas/indicator';
import type { MapLayerDescriptor } from '../schemas/layer';
import type { DataAccessPolicy } from '../schemas/policy';
import { DATASET_CATALOG } from '../catalog/datasets';
import { INDICATOR_DEFINITIONS, INDICATOR_OBSERVATIONS } from '../catalog/indicators';
import { LAYER_REGISTRY } from '../catalog/layers';
import { DEFAULT_ACCESS_POLICIES } from '../policies/defaultPolicies';

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/** No `internal://` or other fake scheme is ever accepted here — a source that isn't a real,
 * fetchable HTTPS URL belongs in `source.repositoryPath` instead (see dataset.ts), so the UI never
 * has to decide whether to render a dead link. */
function isHttpsUrl(url: string): boolean {
  return url.startsWith('https://');
}

/** Relative to the repo root, no absolute path, no `..` traversal. */
function isSafeRepositoryPath(path: string): boolean {
  if (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)) return false;
  return !path.split(/[\\/]/).includes('..');
}

function documentsMissingChecksum(dataset: DatasetDescriptor): boolean {
  return dataset.quality.knownLimitations.some((note) => /checksum/i.test(note));
}

function referenceTimestamp(dataset: DatasetDescriptor): number | null {
  const raw = dataset.generatedAt ?? dataset.period?.end ?? dataset.source.retrievalDate;
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? null : time;
}

export interface CatalogValidationInput {
  datasets: readonly DatasetDescriptor[];
  indicatorDefinitions: readonly IndicatorDefinition[];
  indicatorObservations: readonly IndicatorObservation[];
  layers: readonly MapLayerDescriptor[];
  policies: Readonly<Record<string, DataAccessPolicy>>;
  /** Injectable for tests; defaults to the real current time. */
  now?: Date;
}

export function validateCatalog({
  datasets,
  indicatorDefinitions,
  indicatorObservations,
  layers,
  policies,
  now = new Date(),
}: CatalogValidationInput): string[] {
  const issues: string[] = [];
  const datasetIds = new Set(datasets.map((dataset) => dataset.id));
  const indicatorCodes = new Set(indicatorDefinitions.map((definition) => definition.code));
  const indicatorByCode = new Map(
    indicatorDefinitions.map((definition) => [definition.code, definition]),
  );

  const duplicateDatasetIds = findDuplicates(datasets.map((dataset) => dataset.id));
  if (duplicateDatasetIds.length)
    issues.push(`Trùng dataset id: ${duplicateDatasetIds.join(', ')}`);

  const duplicateIndicatorCodes = findDuplicates(
    indicatorDefinitions.map((definition) => definition.code),
  );
  if (duplicateIndicatorCodes.length)
    issues.push(`Trùng indicator code: ${duplicateIndicatorCodes.join(', ')}`);

  const duplicateLayerIds = findDuplicates(layers.map((layer) => layer.id));
  if (duplicateLayerIds.length) issues.push(`Trùng layer id: ${duplicateLayerIds.join(', ')}`);

  for (const definition of indicatorDefinitions) {
    if (!datasetIds.has(definition.sourceDatasetId))
      issues.push(
        `Indicator ${definition.code} tham chiếu dataset không tồn tại: ${definition.sourceDatasetId}`,
      );
  }

  for (const layer of layers) {
    if (!datasetIds.has(layer.datasetId))
      issues.push(`Layer ${layer.id} tham chiếu dataset không tồn tại: ${layer.datasetId}`);
    if (!policies[layer.accessPolicyId])
      issues.push(
        `Layer ${layer.id} tham chiếu access policy không tồn tại: ${layer.accessPolicyId}`,
      );
  }

  for (const [index, observation] of indicatorObservations.entries()) {
    const label = `${observation.indicatorCode}@${observation.administrativeCode}#${index}`;
    if (!datasetIds.has(observation.sourceDatasetId))
      issues.push(
        `Observation ${label} tham chiếu dataset không tồn tại: ${observation.sourceDatasetId}`,
      );
    const definition = indicatorByCode.get(observation.indicatorCode);
    if (!indicatorCodes.has(observation.indicatorCode)) {
      issues.push(
        `Observation ${label} tham chiếu indicator không tồn tại: ${observation.indicatorCode}`,
      );
    } else if (
      definition &&
      !definition.allowedAdministrativeLevels.includes(observation.administrativeLevel)
    ) {
      issues.push(
        `Observation ${label} có administrativeLevel '${observation.administrativeLevel}' không được indicator '${observation.indicatorCode}' cho phép (chỉ ${definition.allowedAdministrativeLevels.join('/')}) — có thể đang gán nhầm số liệu cấp tỉnh cho xã hoặc ngược lại.`,
      );
    }
    if (observation.value !== null && !Number.isFinite(observation.value))
      issues.push(`Observation ${label} có giá trị không hợp lệ (NaN/Infinity)`);
  }

  for (const dataset of datasets) {
    if (dataset.source.sourceUrl && !isHttpsUrl(dataset.source.sourceUrl))
      issues.push(
        `Dataset ${dataset.id} có sourceUrl không phải HTTPS: ${dataset.source.sourceUrl}. Dùng source.repositoryPath cho nguồn nội bộ trong repo.`,
      );
    if (dataset.source.repositoryPath && !isSafeRepositoryPath(dataset.source.repositoryPath))
      issues.push(
        `Dataset ${dataset.id} có repositoryPath không hợp lệ (phải là đường dẫn tương đối, không chứa '..'): ${dataset.source.repositoryPath}`,
      );
    if (!dataset.checksum && !documentsMissingChecksum(dataset))
      issues.push(
        `Dataset ${dataset.id} không có checksum và không ghi chú lý do trong knownLimitations`,
      );
    // Public-bundle leakage guard (spec §6/§11): a dataset actually shipped in the static bundle
    // must be classification:public — this is the one invariant that must never regress silently.
    if (dataset.access.delivery === 'bundled-static' && dataset.classification !== 'public')
      issues.push(
        `RÒ RỈ DỮ LIỆU: dataset ${dataset.id} có access.delivery='bundled-static' nhưng classification='${dataset.classification}' — sẽ lọt vào bundle công khai.`,
      );
    // A dataset claiming public bundled delivery must not also demand authentication — those two
    // facts contradict each other (spec §3.1).
    if (dataset.access.delivery === 'bundled-static' && dataset.access.requiresAuthentication)
      issues.push(
        `Dataset ${dataset.id} có access.delivery='bundled-static' nhưng requiresAuthentication=true — mâu thuẫn: dữ liệu đã nằm trong bundle công khai thì không thể yêu cầu xác thực.`,
      );
    const referenceTime = referenceTimestamp(dataset);
    if (referenceTime !== null && referenceTime > now.getTime())
      issues.push(
        `Dataset ${dataset.id} có ngày (generatedAt/period.end/retrievalDate) trong tương lai so với thời điểm kiểm tra — có thể là lỗi nhập liệu.`,
      );
  }

  return issues;
}

export const catalogValidationIssues = validateCatalog({
  datasets: DATASET_CATALOG,
  indicatorDefinitions: INDICATOR_DEFINITIONS,
  indicatorObservations: INDICATOR_OBSERVATIONS,
  layers: LAYER_REGISTRY,
  policies: DEFAULT_ACCESS_POLICIES,
});
