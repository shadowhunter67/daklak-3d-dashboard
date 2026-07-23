import { describe, expect, it } from 'vitest';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { getDatasetById } from '../../data-platform/catalog/datasets';
import { PROJECT_SECTORS } from './types';
import {
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from './validation/validateProject';
import { runDataQualityRules } from './validation/dataQualityRules';
import {
  MOCK_AGENCIES,
  MOCK_CONTRACTORS,
  MOCK_EVIDENCE,
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from './mockPortfolio';

const validAdministrativeCodes = new Set(Object.keys(labels));

describe('MOCK_PROJECT_BUNDLES', () => {
  it('has between 8 and 12 projects per spec', () => {
    expect(MOCK_PROJECT_BUNDLES.length).toBeGreaterThanOrEqual(8);
    expect(MOCK_PROJECT_BUNDLES.length).toBeLessThanOrEqual(12);
  });

  it('covers every required sector at least once', () => {
    const sectors = new Set(MOCK_PROJECT_BUNDLES.map((b) => b.project.sector));
    for (const sector of PROJECT_SECTORS) expect(sectors.has(sector)).toBe(true);
  });

  it('labels every project as illustrative in its description or dataOwner', () => {
    for (const { project } of MOCK_PROJECT_BUNDLES) {
      const labelled = /minh hoạ/i.test(project.description) || /minh hoạ/i.test(project.dataOwner);
      expect(labelled).toBe(true);
    }
  });

  it('passes per-record structural validation with zero errors', () => {
    for (const bundle of MOCK_PROJECT_BUNDLES) {
      expect(validateProjectRecord(bundle.project)).toEqual([]);
      for (const wp of bundle.workPackages) expect(validateWorkPackageRecord(wp)).toEqual([]);
      for (const ms of bundle.milestones) expect(validateMilestoneRecord(ms)).toEqual([]);
      for (const issue of bundle.issues) expect(validateProjectIssueRecord(issue)).toEqual([]);
      for (const snapshot of bundle.progressSnapshots)
        expect(validateProgressSnapshotRecord(snapshot)).toEqual([]);
    }
  });

  it('has every project/progress-snapshot/issue sourceDatasetId resolve through the real catalog', () => {
    const sourceDatasetIds = new Set<string>();
    for (const bundle of MOCK_PROJECT_BUNDLES) {
      sourceDatasetIds.add(bundle.project.sourceDatasetId);
      for (const snapshot of bundle.progressSnapshots)
        sourceDatasetIds.add(snapshot.sourceDatasetId);
      for (const issue of bundle.issues) sourceDatasetIds.add(issue.sourceDatasetId);
    }
    expect(sourceDatasetIds.size).toBeGreaterThan(0);
    for (const id of sourceDatasetIds) {
      const dataset = getDatasetById(id);
      expect(
        dataset,
        `sourceDatasetId '${id}' không resolve được qua DATASET_CATALOG thật`,
      ).toBeDefined();
      expect(dataset?.classification).toBe('public');
      expect(dataset?.authority).toBe('illustrative');
      expect(dataset?.access.delivery).toBe('bundled-static');
      expect(dataset?.access.requiresAuthentication).toBe(false);
    }
  });

  it('passes cross-record data-quality rules with no unexpected issues (only the deliberately-stale scenario project)', () => {
    const issues = runDataQualityRules(MOCK_PROJECT_BUNDLES, {
      validAdministrativeCodes,
      agencies: MOCK_AGENCIES,
      contractors: MOCK_CONTRACTORS,
      evidence: MOCK_EVIDENCE,
      asOf: new Date(MOCK_REFERENCE_DATE),
    });
    // prj-007 is intentionally seeded with an old dataUpdatedAt to exercise the stale-data UI path
    // (see the fixture file comment on prj-007) — every other issue would be unexpected.
    expect(issues).toEqual([
      expect.objectContaining({
        entityType: 'project',
        entityId: 'prj-007',
        rule: 'stale-data',
        severity: 'warning',
      }),
    ]);
  });

  describe('required scenario coverage (spec §7)', () => {
    it('covers on-track, at-risk, delayed and suspended project statuses', () => {
      const statuses = new Set(MOCK_PROJECT_BUNDLES.map((b) => b.project.status));
      expect(statuses.has('at-risk')).toBe(true);
      expect(statuses.has('delayed')).toBe(true);
      expect(statuses.has('suspended')).toBe(true);
      expect(statuses.has('completed')).toBe(true);
      // "on-track" is not a ProjectStatus value — represented here as an active project whose
      // overallProgress matches its plannedProgress (see prj-009).
      const onTrack = MOCK_PROJECT_BUNDLES.find(
        (b) =>
          b.project.status === 'active' && b.project.overallProgress === b.project.plannedProgress,
      );
      expect(onTrack).toBeDefined();
    });

    it('has at least one project with a missing optional KPI input (no adjustedBudget/forecastCompletionDate)', () => {
      const missingInput = MOCK_PROJECT_BUNDLES.find(
        (b) =>
          b.project.adjustedBudget === undefined && b.project.forecastCompletionDate === undefined,
      );
      expect(missingInput).toBeDefined();
    });

    it('has at least one project without geometry', () => {
      expect(MOCK_PROJECT_BUNDLES.some((b) => b.project.geometry === undefined)).toBe(true);
    });

    it('has at least one project spanning multiple administrative areas', () => {
      expect(MOCK_PROJECT_BUNDLES.some((b) => b.project.administrativeAreaCodes.length > 1)).toBe(
        true,
      );
    });

    it('has at least one project with an overdue critical issue', () => {
      const now = new Date(MOCK_REFERENCE_DATE).getTime();
      const hasOverdueCritical = MOCK_PROJECT_BUNDLES.some((b) =>
        b.issues.some(
          (issue) =>
            issue.severity === 'critical' &&
            issue.status !== 'resolved' &&
            issue.status !== 'closed' &&
            issue.dueAt !== undefined &&
            new Date(issue.dueAt).getTime() < now,
        ),
      );
      expect(hasOverdueCritical).toBe(true);
    });

    it('has at least one project with zero issues', () => {
      expect(MOCK_PROJECT_BUNDLES.some((b) => b.issues.length === 0)).toBe(true);
    });

    it('has at least one project with more than one progress snapshot (history)', () => {
      expect(MOCK_PROJECT_BUNDLES.some((b) => b.progressSnapshots.length > 1)).toBe(true);
    });

    it('has exactly one project seeded as stale (dataUpdatedAt beyond the freshness SLA)', () => {
      const staleThresholdMs = 90 * 24 * 60 * 60 * 1000;
      const asOfMs = new Date(MOCK_REFERENCE_DATE).getTime();
      const stale = MOCK_PROJECT_BUNDLES.filter(
        (b) =>
          b.project.status !== 'completed' &&
          b.project.status !== 'cancelled' &&
          asOfMs - new Date(b.project.dataUpdatedAt).getTime() > staleThresholdMs,
      );
      expect(stale).toHaveLength(1);
      expect(stale[0]?.project.id).toBe('prj-007');
    });
  });
});
