/**
 * Deterministic synthetic dataset generator — Phase 5 §A3 importer benchmark. KHÔNG dùng dữ liệu
 * thật, KHÔNG dùng `Math.random()`/`Date.now()` — mọi ID/giá trị suy ra thuần tuý từ chỉ số vòng lặp
 * để hai lần chạy cùng `projectCount` luôn sinh ra CHÍNH XÁC cùng nội dung (cần thiết để benchmark
 * không trở thành flaky test theo may rủi dữ liệu, chỉ theo thời gian đo được).
 */
import type { CanonicalProjectPortfolioDatasets } from '../../../src/entities/project/canonicalBundle';
import type {
  Agency,
  Contractor,
  Milestone,
  ProgressSnapshot,
  Project,
  ProjectIssue,
  WorkPackage,
} from '../../../src/entities/project/types';

const AGENCY_POOL_SIZE = 5;
const CONTRACTOR_POOL_SIZE = 8;
const WORK_PACKAGES_PER_PROJECT = 3;
const MILESTONES_PER_PROJECT = 2;
const ISSUES_PER_PROJECT = 1;
const SNAPSHOTS_PER_PROJECT = 6;

const SECTORS: readonly Project['sector'][] = [
  'transport',
  'energy',
  'irrigation',
  'health',
  'education',
];
const STATUSES: readonly Project['status'][] = ['active', 'at-risk', 'delayed', 'completed'];

export interface SyntheticDatasetSizeReport {
  projectCount: number;
  workPackageCount: number;
  milestoneCount: number;
  issueCount: number;
  progressSnapshotCount: number;
  agencyCount: number;
  contractorCount: number;
}

export function generateSyntheticDatasets(projectCount: number): {
  datasets: CanonicalProjectPortfolioDatasets;
  sizeReport: SyntheticDatasetSizeReport;
} {
  const agencies: Agency[] = Array.from({ length: AGENCY_POOL_SIZE }, (_, i) => ({
    id: `bench-agency-${i}`,
    name: `Synthetic Agency ${i}`,
    type: 'managing-authority',
  }));
  const contractors: Contractor[] = Array.from({ length: CONTRACTOR_POOL_SIZE }, (_, i) => ({
    id: `bench-contractor-${i}`,
    name: `Synthetic Contractor ${i}`,
  }));

  const projects: Project[] = [];
  const workPackages: WorkPackage[] = [];
  const milestones: Milestone[] = [];
  const projectIssues: ProjectIssue[] = [];
  const progressSnapshots: ProgressSnapshot[] = [];

  for (let i = 0; i < projectCount; i += 1) {
    const projectId = `bench-project-${i}`;
    const agencyId = agencies[i % AGENCY_POOL_SIZE].id;
    projects.push({
      id: projectId,
      code: `BP-${i}`,
      name: `Synthetic Project ${i}`,
      description: 'Deterministic synthetic benchmark project — not real data.',
      sector: SECTORS[i % SECTORS.length],
      status: STATUSES[i % STATUSES.length],
      priority: 'medium',
      managingAuthorityId: agencyId,
      investorId: agencyId,
      approvedBudget: 1_000_000_000 + i * 1000,
      disbursedAmount: 500_000_000 + i * 500,
      overallProgress: i % 101,
      plannedProgress: (i + 5) % 101,
      financialProgress: (i + 10) % 101,
      administrativeAreaCodes: ['22015'],
      dataUpdatedAt: '2026-01-01T00:00:00.000Z',
      dataOwner: 'Synthetic benchmark generator',
      sourceDatasetId: 'project-portfolio-illustrative',
      confidence: 'medium',
      verificationStatus: 'submitted',
    });

    for (let w = 0; w < WORK_PACKAGES_PER_PROJECT; w += 1) {
      workPackages.push({
        id: `bench-wp-${i}-${w}`,
        projectId,
        code: `WP-${i}-${w}`,
        name: `Synthetic work package ${i}-${w}`,
        contractorId: contractors[(i + w) % CONTRACTOR_POOL_SIZE].id,
        plannedStart: '2026-01-01',
        plannedEnd: '2026-06-01',
        plannedProgress: (i + w) % 101,
        actualProgress: (i + w + 3) % 101,
        budget: 100_000_000 + w * 10,
        paidAmount: 50_000_000 + w * 5,
        status: 'active',
      });
    }

    for (let m = 0; m < MILESTONES_PER_PROJECT; m += 1) {
      milestones.push({
        id: `bench-ms-${i}-${m}`,
        projectId,
        name: `Synthetic milestone ${i}-${m}`,
        plannedDate: '2026-06-01',
        critical: m === 0,
        status: 'planned',
      });
    }

    for (let iss = 0; iss < ISSUES_PER_PROJECT; iss += 1) {
      projectIssues.push({
        id: `bench-issue-${i}-${iss}`,
        projectId,
        category: 'technical',
        severity: 'medium',
        title: `Synthetic issue ${i}-${iss}`,
        description: 'Deterministic synthetic issue.',
        openedAt: '2026-01-15T00:00:00.000Z',
        status: 'open',
        evidenceIds: [],
        sourceDatasetId: 'project-portfolio-illustrative',
      });
    }

    for (let s = 0; s < SNAPSHOTS_PER_PROJECT; s += 1) {
      progressSnapshots.push({
        projectId,
        observedAt: `2026-0${(s % 6) + 1}-01T00:00:00.000Z`,
        plannedPhysicalProgress: (i + s) % 101,
        physicalProgress: (i + s + 2) % 101,
        financialProgress: (i + s + 4) % 101,
        disbursedAmount: 10_000_000 + s * 1000,
        sourceDatasetId: 'project-portfolio-illustrative',
        sourceRecordId: `bench-snap-${i}-${s}`,
        importedAt: '2026-01-20T00:00:00.000Z',
        verificationStatus: 'submitted',
      });
    }
  }

  return {
    datasets: {
      agencies,
      contractors,
      projects,
      workPackages,
      milestones,
      projectIssues,
      progressSnapshots,
      evidence: [],
      referenceDocuments: [],
    },
    sizeReport: {
      projectCount,
      workPackageCount: workPackages.length,
      milestoneCount: milestones.length,
      issueCount: projectIssues.length,
      progressSnapshotCount: progressSnapshots.length,
      agencyCount: agencies.length,
      contractorCount: contractors.length,
    },
  };
}
