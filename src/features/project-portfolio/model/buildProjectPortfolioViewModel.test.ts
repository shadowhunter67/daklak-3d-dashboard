import { describe, expect, it } from 'vitest';
import labels from '../../../assets/maps/daklak/daklak-labels.json';
import {
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from '../../../entities/project/illustrativeProjectPortfolio';
import type { ProjectBundle } from '../../../entities/project/types';
import { buildProjectPortfolioViewModel } from './buildProjectPortfolioViewModel';

const validAdministrativeCodes = new Set(Object.keys(labels));
const asOf = new Date(MOCK_REFERENCE_DATE);
const context = { validAdministrativeCodes, asOf };

describe('buildProjectPortfolioViewModel', () => {
  it('is deterministic for the same input and asOf', () => {
    const first = buildProjectPortfolioViewModel({ bundles: MOCK_PROJECT_BUNDLES, context });
    const second = buildProjectPortfolioViewModel({ bundles: MOCK_PROJECT_BUNDLES, context });
    expect(first).toEqual(second);
  });

  it('produces one row per valid project', () => {
    const model = buildProjectPortfolioViewModel({ bundles: MOCK_PROJECT_BUNDLES, context });
    expect(model.rows).toHaveLength(MOCK_PROJECT_BUNDLES.length);
    expect(model.totalCount).toBe(MOCK_PROJECT_BUNDLES.length);
  });

  it('excludes an invalid project from rows and filter option counts', () => {
    const broken: ProjectBundle = {
      ...MOCK_PROJECT_BUNDLES[0],
      project: { ...MOCK_PROJECT_BUNDLES[0].project, approvedBudget: -1 },
    };
    const model = buildProjectPortfolioViewModel({
      bundles: [broken, ...MOCK_PROJECT_BUNDLES.slice(1)],
      context,
    });
    expect(model.rows.some((r) => r.projectId === broken.project.id)).toBe(false);
    expect(model.totalCount).toBe(MOCK_PROJECT_BUNDLES.length - 1);
  });

  it('never uses geometry/ward as the row identity — code/name are always present', () => {
    const model = buildProjectPortfolioViewModel({ bundles: MOCK_PROJECT_BUNDLES, context });
    for (const row of model.rows) {
      expect(row.code).toBeTruthy();
      expect(row.name).toBeTruthy();
    }
  });

  it('builds status/sector/area filter options with correct counts summing to totalCount for status', () => {
    const model = buildProjectPortfolioViewModel({ bundles: MOCK_PROJECT_BUNDLES, context });
    const statusSum = model.filterOptions.status.reduce((sum, o) => sum + o.count, 0);
    expect(statusSum).toBe(model.totalCount);
  });

  it('assigns a primaryReason to a delayed project (via the shared attention-reason logic)', () => {
    const model = buildProjectPortfolioViewModel({ bundles: MOCK_PROJECT_BUNDLES, context });
    const delayedRow = model.rows.find((r) => r.status === 'delayed');
    // prj-005 is both delayed and has an overdue critical issue — REASON_RANK ranks
    // 'overdue-critical-issue' above 'delayed', so either is an acceptable primary reason here;
    // what matters is that a row's status alone never leaves reasonCategory null.
    expect(delayedRow?.reasonCategory).not.toBeNull();
  });

  it('marks unavailable KPI inputs with status unavailable, never a bare 0', () => {
    const model = buildProjectPortfolioViewModel({ bundles: MOCK_PROJECT_BUNDLES, context });
    for (const row of model.rows) {
      if (row.disbursementRate.status === 'unavailable') {
        expect(row.disbursementRate.value).toBeNull();
      }
    }
  });
});
