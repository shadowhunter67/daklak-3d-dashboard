import { describe, expect, it } from 'vitest';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { summarizeDataQuality } from './dataQualitySummary';
import {
  MOCK_AGENCIES,
  MOCK_CONTRACTORS,
  MOCK_EVIDENCE,
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from './illustrativeProjectPortfolio';
import type { ProjectBundle } from './types';

const validAdministrativeCodes = new Set(Object.keys(labels));
const asOf = new Date(MOCK_REFERENCE_DATE);

describe('summarizeDataQuality', () => {
  it('reports the mock portfolio as valid, with exactly the one deliberately-stale scenario project surfaced', () => {
    const summary = summarizeDataQuality(MOCK_PROJECT_BUNDLES, {
      validAdministrativeCodes,
      agencies: MOCK_AGENCIES,
      contractors: MOCK_CONTRACTORS,
      evidence: MOCK_EVIDENCE,
      asOf,
    });
    expect(summary.totalProjects).toBe(MOCK_PROJECT_BUNDLES.length);
    // No record is structurally invalid — "stale" is a quality issue, not a validation error (see
    // portfolioAssessment.ts and docs/domain-model.md).
    expect(summary.invalidProjects).toBe(0);
    expect(summary.validProjects).toBe(MOCK_PROJECT_BUNDLES.length);
    expect(summary.staleProjectCount).toBe(1);
    expect(summary.duplicateRecordCount).toBe(0);
    expect(summary.unmappedAdministrativeCodeCount).toBe(0);
    expect(summary.totalDataQualityIssues).toBe(1);
    expect(summary.sourceAvailable).toBe(true);
  });

  it('counts an invalid project without crashing the whole summary', () => {
    const broken: ProjectBundle = {
      ...MOCK_PROJECT_BUNDLES[0],
      project: { ...MOCK_PROJECT_BUNDLES[0].project, id: 'broken', overallProgress: 999 },
    };
    const summary = summarizeDataQuality([...MOCK_PROJECT_BUNDLES, broken], {
      validAdministrativeCodes,
      agencies: MOCK_AGENCIES,
      contractors: MOCK_CONTRACTORS,
      evidence: MOCK_EVIDENCE,
      asOf,
    });
    expect(summary.invalidProjects).toBe(1);
    expect(summary.validProjects).toBe(MOCK_PROJECT_BUNDLES.length);
  });
});
