import { describe, expect, it } from 'vitest';
import labels from '../../../assets/maps/daklak/daklak-labels.json';
import { PROJECT_SECTORS } from '../types';
import {
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from '../validation/validateProject';
import { runDataQualityRules } from '../validation/dataQualityRules';
import {
  MOCK_AGENCIES,
  MOCK_CONTRACTORS,
  MOCK_EVIDENCE,
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from './projects.mock';

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

  it('passes cross-record data-quality rules against the real ward code set', () => {
    const issues = runDataQualityRules(MOCK_PROJECT_BUNDLES, {
      validAdministrativeCodes,
      agencies: MOCK_AGENCIES,
      contractors: MOCK_CONTRACTORS,
      evidence: MOCK_EVIDENCE,
      now: new Date(MOCK_REFERENCE_DATE),
    });
    expect(issues).toEqual([]);
  });
});
