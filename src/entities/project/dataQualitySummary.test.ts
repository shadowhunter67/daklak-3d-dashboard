import { describe, expect, it } from 'vitest';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { summarizeDataQuality } from './dataQualitySummary';
import {
  MOCK_AGENCIES,
  MOCK_CONTRACTORS,
  MOCK_EVIDENCE,
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from './fixtures/projects.mock';
import type { ProjectBundle } from './types';

const validAdministrativeCodes = new Set(Object.keys(labels));

describe('summarizeDataQuality', () => {
  it('reports the full mock portfolio as clean', () => {
    const summary = summarizeDataQuality(
      MOCK_PROJECT_BUNDLES,
      {
        validAdministrativeCodes,
        agencies: MOCK_AGENCIES,
        contractors: MOCK_CONTRACTORS,
        evidence: MOCK_EVIDENCE,
      },
      new Date(MOCK_REFERENCE_DATE),
    );
    expect(summary.totalProjects).toBe(MOCK_PROJECT_BUNDLES.length);
    expect(summary.invalidProjects).toBe(0);
    expect(summary.staleProjectCount).toBe(0);
    expect(summary.duplicateRecordCount).toBe(0);
    expect(summary.unmappedAdministrativeCodeCount).toBe(0);
    expect(summary.totalDataQualityIssues).toBe(0);
    expect(summary.sourceAvailable).toBe(true);
  });

  it('counts an invalid project without crashing the whole summary', () => {
    const broken: ProjectBundle = {
      ...MOCK_PROJECT_BUNDLES[0],
      project: { ...MOCK_PROJECT_BUNDLES[0].project, id: 'broken', overallProgress: 999 },
    };
    const summary = summarizeDataQuality(
      [...MOCK_PROJECT_BUNDLES, broken],
      {
        validAdministrativeCodes,
        agencies: MOCK_AGENCIES,
        contractors: MOCK_CONTRACTORS,
        evidence: MOCK_EVIDENCE,
      },
      new Date(MOCK_REFERENCE_DATE),
    );
    expect(summary.invalidProjects).toBe(1);
    expect(summary.validProjects).toBe(MOCK_PROJECT_BUNDLES.length);
  });
});
