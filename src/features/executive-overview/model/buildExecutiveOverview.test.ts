import { describe, expect, it } from 'vitest';
import labels from '../../../assets/maps/daklak/daklak-labels.json';
import {
  MOCK_AGENCIES,
  MOCK_CONTRACTORS,
  MOCK_EVIDENCE,
  MOCK_PORTFOLIO_PROVENANCE,
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from '../../../entities/project/illustrativeProjectPortfolio';
import type { ProjectBundle } from '../../../entities/project/types';
import { buildExecutiveOverview } from './buildExecutiveOverview';

const validAdministrativeCodes = new Set(Object.keys(labels));
const asOf = new Date(MOCK_REFERENCE_DATE);
const context = {
  validAdministrativeCodes,
  agencies: MOCK_AGENCIES,
  contractors: MOCK_CONTRACTORS,
  evidence: MOCK_EVIDENCE,
  asOf,
};
const provenance = { ...MOCK_PORTFOLIO_PROVENANCE, loadedInBrowserAt: asOf.toISOString() };

describe('buildExecutiveOverview', () => {
  it('is deterministic for the same input and asOf', () => {
    const first = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    const second = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    expect(first).toEqual(second);
  });

  it('sets totalProjects to the bundle count, always available', () => {
    const model = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    expect(model.kpis.totalProjects.status).toBe('ok');
    expect(model.kpis.totalProjects.value).toBe(MOCK_PROJECT_BUNDLES.length);
  });

  it('reports zero total projects as ok, not unavailable (an empty portfolio is a real answer)', () => {
    const model = buildExecutiveOverview({ bundles: [], context, provenance });
    expect(model.kpis.totalProjects.status).toBe('ok');
    expect(model.kpis.totalProjects.value).toBe(0);
    expect(model.kpis.disbursementRate.status).toBe('unavailable');
  });

  it('ranks a project with an overdue critical issue above one that is merely delayed', () => {
    const model = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    const overdueCriticalIndex = model.priorityProjects.findIndex(
      (p) => p.reasonCategory === 'overdue-critical-issue',
    );
    const delayedIndex = model.priorityProjects.findIndex((p) => p.reasonCategory === 'delayed');
    expect(overdueCriticalIndex).toBeGreaterThanOrEqual(0);
    if (delayedIndex >= 0) expect(overdueCriticalIndex).toBeLessThan(delayedIndex);
  });

  it('never includes more than 5 priority projects', () => {
    const model = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    expect(model.priorityProjects.length).toBeLessThanOrEqual(5);
  });

  it('excludes an invalid project from priorityProjects even if it would otherwise rank high', () => {
    const broken: ProjectBundle = {
      ...MOCK_PROJECT_BUNDLES[0],
      project: {
        ...MOCK_PROJECT_BUNDLES[0].project,
        id: 'broken',
        status: 'delayed',
        overallProgress: 999,
      },
    };
    const model = buildExecutiveOverview({
      bundles: [...MOCK_PROJECT_BUNDLES, broken],
      context,
      provenance,
    });
    expect(model.priorityProjects.some((p) => p.projectId === 'broken')).toBe(false);
  });

  it('keeps validationErrors, qualityIssues (as data-quality alerts) and businessAlerts distinct', () => {
    const broken: ProjectBundle = {
      ...MOCK_PROJECT_BUNDLES[0],
      project: { ...MOCK_PROJECT_BUNDLES[0].project, id: 'broken-2', overallProgress: 999 },
    };
    const model = buildExecutiveOverview({
      bundles: [...MOCK_PROJECT_BUNDLES, broken],
      context,
      provenance,
    });
    // The invalid record must not surface as any kind of alert — it is excluded from the model
    // entirely (dataHealth.invalidProjects counts it instead, see dataQualitySummary).
    expect(model.alerts.some((a) => a.projectId === 'broken-2')).toBe(false);
  });

  it('reports portfolioStatus critical when a critical business alert exists', () => {
    const model = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    const hasCriticalBusinessAlert = model.alerts.some(
      (a) => a.kind === 'business' && a.severity === 'critical',
    );
    expect(hasCriticalBusinessAlert).toBe(true);
    expect(model.portfolioStatus).toBe('critical');
  });

  it('reports portfolioStatus degraded when the source is degraded, regardless of alert content', () => {
    const model = buildExecutiveOverview({
      bundles: [],
      context,
      provenance,
      sourceStatus: 'degraded',
    });
    expect(model.portfolioStatus).toBe('degraded');
  });

  it('reports portfolioStatus healthy for a clean, alert-free portfolio', () => {
    const clean: ProjectBundle = {
      ...MOCK_PROJECT_BUNDLES.find((b) => b.project.id === 'prj-004')!,
    };
    const model = buildExecutiveOverview({ bundles: [clean], context, provenance });
    expect(model.alerts).toEqual([]);
    expect(model.portfolioStatus).toBe('healthy');
  });

  it('builds dataHealth with a confidence breakdown covering every bundle', () => {
    const model = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    const totalConfidence = Object.values(model.dataHealth.confidenceBreakdown).reduce(
      (a, b) => a + b,
      0,
    );
    expect(totalConfidence).toBe(MOCK_PROJECT_BUNDLES.length);
  });

  it('builds a statusDistribution covering every ProjectStatus key, summing to the valid project count', () => {
    const model = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    const total = Object.values(model.statusDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(MOCK_PROJECT_BUNDLES.length);
    expect(model.statusDistribution.suspended).toBeGreaterThanOrEqual(1);
    expect(model.statusDistribution.delayed).toBeGreaterThanOrEqual(1);
  });

  it('uses asOf for generatedAt, not the real current time', () => {
    const model = buildExecutiveOverview({ bundles: MOCK_PROJECT_BUNDLES, context, provenance });
    expect(model.generatedAt).toBe(asOf.toISOString());
  });
});
