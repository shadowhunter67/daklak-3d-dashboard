import type { ProjectBundle } from '../../entities/project/types';

export interface ReportSummary {
  total: number;
  completed: number;
  delayed: number;
  atRisk: number;
  dataWarnings: number;
  disbursementRate: number | null;
  byStatus: { status: string; count: number }[];
  bySector: { sector: string; count: number }[];
  byArea: { area: string; count: number }[];
  attention: { id: string; name: string; status: string; area: string }[];
  highlights: {
    disbursementRate: number | null;
    delayed: number;
    completed: number;
    dataWarnings: number;
  };
  unitAttention: {
    area: string;
    total: number;
    delayed: number;
    openIssues: number;
  }[];
}

export function buildReportSummary(bundles: readonly ProjectBundle[]): ReportSummary {
  const byStatus = new Map<string, number>();
  const bySector = new Map<string, number>();
  const byArea = new Map<string, number>();
  const delayedByArea = new Map<string, number>();
  const issuesByArea = new Map<string, number>();
  let budget = 0;
  let disbursed = 0;
  let dataWarnings = 0;
  for (const bundle of bundles) {
    const p = bundle.project;
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    bySector.set(p.sector, (bySector.get(p.sector) ?? 0) + 1);
    for (const area of p.administrativeAreaCodes) byArea.set(area, (byArea.get(area) ?? 0) + 1);
    for (const area of p.administrativeAreaCodes) {
      if (p.status === 'delayed') delayedByArea.set(area, (delayedByArea.get(area) ?? 0) + 1);
      const openIssues = bundle.issues.filter(
        (issue) => !['resolved', 'closed'].includes(issue.status),
      ).length;
      issuesByArea.set(area, (issuesByArea.get(area) ?? 0) + openIssues);
    }
    budget += p.approvedBudget;
    disbursed += p.disbursedAmount;
    dataWarnings += bundle.issues.filter(
      (issue) => issue.status !== 'resolved' && issue.status !== 'closed',
    ).length;
  }
  const entries = <T extends 'status' | 'sector'>(map: Map<string, number>, key: T) =>
    [...map.entries()].map(([value, count]) => ({ [key]: value, count })) as {
      [K in T]: string;
    }[] &
      { count: number }[];
  const attention = bundles
    .filter(
      ({ project, issues }) =>
        ['delayed', 'at-risk'].includes(project.status) ||
        issues.some((issue) => issue.status !== 'resolved' && issue.status !== 'closed'),
    )
    .sort(
      (a, b) =>
        Number(b.project.status === 'delayed') - Number(a.project.status === 'delayed') ||
        b.issues.length - a.issues.length,
    )
    .slice(0, 8)
    .map(({ project }) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      area: project.administrativeAreaCodes[0] ?? '—',
    }));
  return {
    total: bundles.length,
    completed: byStatus.get('completed') ?? 0,
    delayed: byStatus.get('delayed') ?? 0,
    atRisk: byStatus.get('at-risk') ?? 0,
    dataWarnings,
    disbursementRate: budget ? (disbursed / budget) * 100 : null,
    byStatus: entries(byStatus, 'status') as { status: string; count: number }[],
    bySector: entries(bySector, 'sector') as { sector: string; count: number }[],
    byArea: [...byArea.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count),
    attention,
    highlights: {
      disbursementRate: budget ? (disbursed / budget) * 100 : null,
      delayed: byStatus.get('delayed') ?? 0,
      completed: byStatus.get('completed') ?? 0,
      dataWarnings,
    },
    unitAttention: [...byArea.entries()]
      .map(([area, total]) => ({
        area,
        total,
        delayed: delayedByArea.get(area) ?? 0,
        openIssues: issuesByArea.get(area) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.delayed - a.delayed ||
          b.openIssues - a.openIssues ||
          b.total - a.total ||
          a.area.localeCompare(b.area),
      ),
  };
}
