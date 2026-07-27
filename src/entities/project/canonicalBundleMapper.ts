/**
 * Transport → domain mapper — Phase 3 (docs/project-data-import/, ADR 0006). Canonical bundle
 * (`CanonicalProjectPortfolioDatasets`) là dataset-oriented (mảng phẳng theo loại entity, giống cấu
 * trúc CSV/import thật sẽ có ở Phase 4); domain KPI/validation hiện có (`assessPortfolio`,
 * `kpi/index.ts`) tiêu thụ `ProjectBundle[]` project-oriented (gom theo `projectId`). Hàm thuần này
 * là mapper tường minh giữa hai shape — đúng điều kiện #2 của "API contract gate"
 * (docs/domain-model.md): không dùng domain type trực tiếp làm response shape, luôn có một bước map
 * tường minh.
 *
 * Không validate business rule ở đây — chỉ nhóm dữ liệu. Validate (Layer 2 domain, Layer 3
 * cross-record) là việc của `validateProject.ts`/`dataQualityRules.ts`, gọi SAU bước map này (xem
 * `GeneratedJsonProjectPortfolioSource`).
 */
import type { CanonicalProjectPortfolioDatasets } from './canonicalBundle';
import type {
  Milestone,
  ProgressSnapshot,
  ProjectBundle,
  ProjectIssue,
  WorkPackage,
} from './types';

function groupByProjectId<T extends { projectId: string }>(
  records: readonly T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const record of records) {
    const bucket = grouped.get(record.projectId);
    if (bucket) bucket.push(record);
    else grouped.set(record.projectId, [record]);
  }
  return grouped;
}

export function groupCanonicalDatasetsIntoProjectBundles(
  datasets: CanonicalProjectPortfolioDatasets,
): ProjectBundle[] {
  const workPackagesByProject = groupByProjectId<WorkPackage>(datasets.workPackages);
  const milestonesByProject = groupByProjectId<Milestone>(datasets.milestones);
  const issuesByProject = groupByProjectId<ProjectIssue>(datasets.projectIssues);
  const snapshotsByProject = groupByProjectId<ProgressSnapshot>(datasets.progressSnapshots);

  return datasets.projects.map((project) => ({
    project,
    workPackages: workPackagesByProject.get(project.id) ?? [],
    milestones: milestonesByProject.get(project.id) ?? [],
    issues: issuesByProject.get(project.id) ?? [],
    progressSnapshots: snapshotsByProject.get(project.id) ?? [],
  }));
}
