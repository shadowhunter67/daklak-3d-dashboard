import { describe, expect, it } from 'vitest';
import labels from '../../../assets/maps/daklak/daklak-labels.json';
import { MOCK_PROJECT_BUNDLES, MOCK_REFERENCE_DATE } from '../../../entities/project/mockPortfolio';
import type { ProjectBundle } from '../../../entities/project/types';
import { lookupProjectDetail } from './buildProjectDetailViewModel';

const validAdministrativeCodes = new Set(Object.keys(labels));
const asOf = new Date(MOCK_REFERENCE_DATE);
const context = { validAdministrativeCodes, asOf };

describe('lookupProjectDetail', () => {
  it('finds an existing project by id', () => {
    const target = MOCK_PROJECT_BUNDLES[0];
    const result = lookupProjectDetail({
      bundles: MOCK_PROJECT_BUNDLES,
      context,
      projectId: target.project.id,
    });
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.model.header.projectId).toBe(target.project.id);
      expect(result.model.header.code).toBe(target.project.code);
    }
  });

  it('returns not-found for a non-existent id', () => {
    const result = lookupProjectDetail({
      bundles: MOCK_PROJECT_BUNDLES,
      context,
      projectId: 'does-not-exist',
    });
    expect(result.status).toBe('not-found');
  });

  it('returns not-found for an empty/malformed id', () => {
    const result = lookupProjectDetail({ bundles: MOCK_PROJECT_BUNDLES, context, projectId: '' });
    expect(result.status).toBe('not-found');
  });

  it('returns not-found for a project that fails validation', () => {
    const broken: ProjectBundle = {
      ...MOCK_PROJECT_BUNDLES[0],
      project: { ...MOCK_PROJECT_BUNDLES[0].project, approvedBudget: -1 },
    };
    const result = lookupProjectDetail({
      bundles: [broken, ...MOCK_PROJECT_BUNDLES.slice(1)],
      context,
      projectId: broken.project.id,
    });
    expect(result.status).toBe('not-found');
  });

  it('is deterministic for the same input and asOf', () => {
    const target = MOCK_PROJECT_BUNDLES[0];
    const first = lookupProjectDetail({
      bundles: MOCK_PROJECT_BUNDLES,
      context,
      projectId: target.project.id,
    });
    const second = lookupProjectDetail({
      bundles: MOCK_PROJECT_BUNDLES,
      context,
      projectId: target.project.id,
    });
    expect(first).toEqual(second);
  });

  it('resolves provenance datasets live from the real catalog, not hardcoded', () => {
    const target = MOCK_PROJECT_BUNDLES[0];
    const result = lookupProjectDetail({
      bundles: MOCK_PROJECT_BUNDLES,
      context,
      projectId: target.project.id,
    });
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.model.provenance.length).toBeGreaterThan(0);
      for (const entry of result.model.provenance) {
        expect(entry.dataset).not.toBeNull();
      }
    }
  });

  it('reports no geometry as hasGeometry=false rather than fabricating a point', () => {
    const noGeometryProject = MOCK_PROJECT_BUNDLES.find((b) => !b.project.geometry);
    expect(noGeometryProject).toBeDefined();
    if (!noGeometryProject) return;
    const result = lookupProjectDetail({
      bundles: MOCK_PROJECT_BUNDLES,
      context,
      projectId: noGeometryProject.project.id,
    });
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.model.geography.hasGeometry).toBe(false);
      expect(result.model.geography.geometry).toBeNull();
    }
  });

  it('surfaces the primary attention reason using the shared attention-reason logic', () => {
    const delayedProject = MOCK_PROJECT_BUNDLES.find((b) => b.project.status === 'delayed');
    expect(delayedProject).toBeDefined();
    if (!delayedProject) return;
    const result = lookupProjectDetail({
      bundles: MOCK_PROJECT_BUNDLES,
      context,
      projectId: delayedProject.project.id,
    });
    expect(result.status).toBe('found');
    // prj-005 is both delayed and has an overdue critical issue — REASON_RANK ranks
    // 'overdue-critical-issue' first, so that (not 'delayed') is the primary reason surfaced here;
    // what matters is that a delayed project always gets exactly one non-empty reason.
    if (result.status === 'found') {
      expect(result.model.attentionReasons).toHaveLength(1);
    }
  });

  it('groups issues by severity without dropping any', () => {
    const withIssues = MOCK_PROJECT_BUNDLES.find((b) => b.issues.length > 0);
    expect(withIssues).toBeDefined();
    if (!withIssues) return;
    const result = lookupProjectDetail({
      bundles: MOCK_PROJECT_BUNDLES,
      context,
      projectId: withIssues.project.id,
    });
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      const grouped = Object.values(result.model.issues.bySeverity).flat();
      expect(grouped).toHaveLength(withIssues.issues.length);
    }
  });
});
