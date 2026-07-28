import { describe, expect, it } from 'vitest';
import labels from '../../../assets/maps/daklak/daklak-labels.json';
import { buildDataReadinessViewModel } from './buildDataReadinessViewModel';
import {
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from '../../../entities/project/illustrativeProjectPortfolio';
import type { ProjectPortfolioSourceMetadata } from '../../../entities/project/adapters/ProjectPortfolioSource';

const validAdministrativeCodes = new Set(Object.keys(labels));

const metadata: ProjectPortfolioSourceMetadata = {
  sourceId: 'illustrative',
  sourceKind: 'illustrative',
  displayName: 'Illustrative',
  datasetIds: ['project-portfolio-illustrative'],
  schemaVersion: null,
  bundleVersion: null,
  asOf: MOCK_REFERENCE_DATE,
  generatedAt: MOCK_REFERENCE_DATE,
  isIllustrative: true,
  deploymentCompatibility: ['demo'],
};

describe('buildDataReadinessViewModel', () => {
  it('classifies the mock portfolio quality issues into error vs warning buckets', () => {
    const model = buildDataReadinessViewModel({
      bundles: MOCK_PROJECT_BUNDLES,
      metadata,
      context: {
        validAdministrativeCodes,
        asOf: new Date(MOCK_REFERENCE_DATE),
      },
    });
    // prj-007 stale-data (warning) and prj-013 multiple-verification-stage-records (warning) — both
    // business alerts, never counted as data-quality errors (nguyên tắc #17: warning !== error).
    expect(model.dataQualityIssues).toEqual([]);
    expect(model.businessAlerts.length).toBe(2);
    expect(model.validationErrors).toEqual([]);
  });

  it('reports zero counts for an empty portfolio without crashing', () => {
    const model = buildDataReadinessViewModel({
      bundles: [],
      metadata,
      context: { validAdministrativeCodes: new Set(), asOf: new Date(MOCK_REFERENCE_DATE) },
    });
    expect(model.counts.projects).toBe(0);
    expect(model.validationErrors).toEqual([]);
    expect(model.dataQualityIssues).toEqual([]);
    expect(model.businessAlerts).toEqual([]);
  });

  it('resolves linkedProjectId for a progressSnapshot business alert (Phase 6 C6)', () => {
    const model = buildDataReadinessViewModel({
      bundles: MOCK_PROJECT_BUNDLES,
      metadata,
      context: {
        validAdministrativeCodes,
        asOf: new Date(MOCK_REFERENCE_DATE),
      },
    });
    const snapshotAlert = model.businessAlerts.find((a) => a.entityType === 'progressSnapshot');
    expect(snapshotAlert).toBeDefined();
    expect(snapshotAlert?.linkedProjectId).toBe('prj-013');
  });

  it('never links to a non-existent project (no dead links)', () => {
    const model = buildDataReadinessViewModel({
      bundles: MOCK_PROJECT_BUNDLES,
      metadata,
      context: {
        validAdministrativeCodes,
        asOf: new Date(MOCK_REFERENCE_DATE),
      },
    });
    for (const issue of [...model.dataQualityIssues, ...model.businessAlerts]) {
      if (issue.linkedProjectId) {
        expect(MOCK_PROJECT_BUNDLES.some((b) => b.project.id === issue.linkedProjectId)).toBe(true);
      }
    }
  });

  it('counts low-confidence and unverified projects correctly', () => {
    const model = buildDataReadinessViewModel({
      bundles: MOCK_PROJECT_BUNDLES,
      metadata,
      context: {
        validAdministrativeCodes,
        asOf: new Date(MOCK_REFERENCE_DATE),
      },
    });
    // prj-011 and prj-012 (Phase 5 §B additions) are seeded with confidence: 'low'.
    expect(model.lowConfidenceProjectCount).toBeGreaterThanOrEqual(2);
    // prj-011 and prj-012 are seeded with verificationStatus: 'raw'.
    expect(model.unverifiedProjectCount).toBeGreaterThanOrEqual(2);
  });
});
