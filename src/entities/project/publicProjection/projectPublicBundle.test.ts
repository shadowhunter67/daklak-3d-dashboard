import { describe, expect, it } from 'vitest';
import type { CanonicalProjectPortfolioBundle } from '../canonicalBundle';
import {
  PublicProjectionRefusedError,
  projectCanonicalBundleToPublic,
} from './projectPublicBundle';
import type { PublicFieldAllowlist } from './publicProjectionTypes';

const FIELD_ALLOWLIST: PublicFieldAllowlist = {
  policyVersion: '1.0.0',
  entities: {
    agencies: ['id', 'name', 'type'],
    contractors: ['id', 'name'],
    projects: ['id', 'code', 'name', 'status', 'sourceDatasetId'],
    workPackages: ['id', 'projectId', 'code', 'name', 'status'],
    milestones: ['id', 'projectId', 'name', 'status'],
    projectIssues: ['id', 'projectId', 'title', 'status', 'evidenceIds', 'sourceDatasetId'],
    progressSnapshots: [
      'projectId',
      'observedAt',
      'sourceDatasetId',
      'sourceRecordId',
      'verificationStatus',
    ],
    evidence: ['id', 'title'],
    referenceDocuments: ['id', 'title'],
  },
};

function baseBundle(
  overrides?: Partial<CanonicalProjectPortfolioBundle>,
): CanonicalProjectPortfolioBundle {
  return {
    schemaVersion: '1.0.0',
    bundleVersion: '1.0.0',
    metadata: {
      generatedAt: '2026-01-01T00:00:00.000Z',
      asOf: '2026-01-01T00:00:00.000Z',
      sourceDatasetIds: ['source-dataset-a'],
      administrativeCodeVersion: '2026-01-01',
      classification: 'internal',
      producer: 'test-fixture',
    },
    datasets: {
      agencies: [{ id: 'agency-1', name: 'Agency One', type: 'managing-authority' }],
      contractors: [],
      projects: [
        {
          id: 'project-1',
          code: 'P-1',
          name: 'Project One',
          description: 'internal description',
          sector: 'transport',
          status: 'active',
          priority: 'medium',
          managingAuthorityId: 'agency-1',
          investorId: 'agency-1',
          approvedBudget: 1000,
          disbursedAmount: 100,
          overallProgress: 10,
          plannedProgress: 10,
          financialProgress: 10,
          administrativeAreaCodes: ['22165'],
          dataUpdatedAt: '2026-01-01T00:00:00.000Z',
          dataOwner: 'owner',
          sourceDatasetId: 'source-dataset-a',
          confidence: 'medium',
          verificationStatus: 'approved',
          projectManagerId: 'person-123',
        } as never,
      ],
      workPackages: [
        {
          id: 'wp-1',
          projectId: 'project-1',
          code: 'WP-1',
          name: 'Work package one',
          plannedStart: '2026-01-01',
          plannedEnd: '2026-06-01',
          plannedProgress: 10,
          actualProgress: 10,
          budget: 500,
          paidAmount: 50,
          status: 'active',
        },
      ],
      milestones: [
        {
          id: 'ms-1',
          projectId: 'project-1',
          name: 'Milestone one',
          plannedDate: '2026-03-01',
          critical: false,
          status: 'on-track',
        },
      ],
      projectIssues: [
        {
          id: 'issue-1',
          projectId: 'project-1',
          category: 'technical',
          severity: 'low',
          title: 'Issue one',
          description: 'desc',
          openedAt: '2026-01-01T00:00:00.000Z',
          status: 'open',
          evidenceIds: ['evidence-1', 'evidence-2'],
          sourceDatasetId: 'source-dataset-a',
        },
      ],
      progressSnapshots: [
        {
          projectId: 'project-1',
          observedAt: '2026-01-01T00:00:00.000Z',
          plannedPhysicalProgress: 10,
          physicalProgress: 10,
          financialProgress: 10,
          disbursedAmount: 100,
          sourceDatasetId: 'source-dataset-a',
          sourceRecordId: 'row-1',
          importedAt: '2026-01-02T00:00:00.000Z',
          verificationStatus: 'approved',
        },
      ],
      evidence: [
        { id: 'evidence-1', title: 'Evidence one', kind: 'document' },
        {
          id: 'evidence-2',
          title: 'Evidence two (internal)',
          kind: 'document',
          recordClassification: 'internal',
        } as never,
      ],
      referenceDocuments: [],
    },
    ...overrides,
  } as CanonicalProjectPortfolioBundle;
}

const OPTIONS = {
  fieldAllowlist: FIELD_ALLOWLIST,
  generatedAt: '2026-02-01T00:00:00.000Z',
  producer: 'test-projection-engine@1.0.0',
};

describe('projectCanonicalBundleToPublic', () => {
  it('keeps allowlisted fields on a public record', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    const project = result.bundle.datasets.projects[0] as unknown as Record<string, unknown>;
    expect(project.id).toBe('project-1');
    expect(project.code).toBe('P-1');
    expect(project.sourceDatasetId).toBe('source-dataset-a');
  });

  it('drops fields not in the allowlist (internal field removed)', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    const project = result.bundle.datasets.projects[0] as unknown as Record<string, unknown>;
    expect(project.projectManagerId).toBeUndefined();
    expect(project.description).toBeUndefined();
    expect(project.dataOwner).toBeUndefined();
  });

  it('drops a record with an explicit internal recordClassification', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    const evidenceIds = result.bundle.datasets.evidence.map((e) => (e as { id: string }).id);
    expect(evidenceIds).toEqual(['evidence-1']);
  });

  it('drops a record with restricted recordClassification', () => {
    const bundle = baseBundle();
    (bundle.datasets.projectIssues[0] as unknown as Record<string, unknown>).recordClassification =
      'restricted';
    const result = projectCanonicalBundleToPublic(bundle, OPTIONS);
    expect(result.bundle.datasets.projectIssues).toHaveLength(0);
  });

  it('does not treat missing recordClassification as automatically excluded — field allowlist is the real gate', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    expect(result.bundle.datasets.projects).toHaveLength(1);
  });

  it('rejects an unknown field silently by omission, never by throwing', () => {
    const bundle = baseBundle();
    (bundle.datasets.agencies[0] as unknown as Record<string, unknown>).unexpectedField = 'x';
    const result = projectCanonicalBundleToPublic(bundle, OPTIONS);
    const agency = result.bundle.datasets.agencies[0] as unknown as Record<string, unknown>;
    expect(agency.unexpectedField).toBeUndefined();
  });

  it('does not mutate the source bundle', () => {
    const bundle = baseBundle();
    const snapshotBefore = JSON.stringify(bundle);
    projectCanonicalBundleToPublic(bundle, OPTIONS);
    expect(JSON.stringify(bundle)).toBe(snapshotBefore);
  });

  it('is deterministic — same input produces the same projectedContentChecksum', () => {
    const bundle = baseBundle();
    const r1 = projectCanonicalBundleToPublic(bundle, OPTIONS);
    const r2 = projectCanonicalBundleToPublic(bundle, OPTIONS);
    expect(r1.manifest.projectedContentChecksum).toBe(r2.manifest.projectedContentChecksum);
  });

  it('generatedAt does not affect the projected content checksum', () => {
    const bundle = baseBundle();
    const r1 = projectCanonicalBundleToPublic(bundle, OPTIONS);
    const r2 = projectCanonicalBundleToPublic(bundle, {
      ...OPTIONS,
      generatedAt: '2030-01-01T00:00:00.000Z',
    });
    expect(r1.manifest.projectedContentChecksum).toBe(r2.manifest.projectedContentChecksum);
  });

  it('foreign keys remain valid after projection (evidenceIds pruned, no dangling references)', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    const issue = result.bundle.datasets.projectIssues[0] as unknown as { evidenceIds: string[] };
    expect(issue.evidenceIds).toEqual(['evidence-1']);
  });

  it('cascades removal of dependent records when a project is removed', () => {
    const bundle = baseBundle();
    (bundle.datasets.projects[0] as unknown as Record<string, unknown>).recordClassification =
      'internal';
    const result = projectCanonicalBundleToPublic(bundle, OPTIONS);
    expect(result.bundle.datasets.projects).toHaveLength(0);
    expect(result.bundle.datasets.workPackages).toHaveLength(0);
    expect(result.bundle.datasets.milestones).toHaveLength(0);
    expect(result.bundle.datasets.projectIssues).toHaveLength(0);
    expect(result.bundle.datasets.progressSnapshots).toHaveLength(0);
  });

  it('refuses to project a restricted bundle at all', () => {
    const bundle = baseBundle({
      metadata: { ...baseBundle().metadata, classification: 'restricted' },
    });
    expect(() => projectCanonicalBundleToPublic(bundle, OPTIONS)).toThrow(
      PublicProjectionRefusedError,
    );
  });

  it('refuses to project a confidential bundle at all', () => {
    const bundle = baseBundle({
      metadata: { ...baseBundle().metadata, classification: 'confidential' },
    });
    expect(() => projectCanonicalBundleToPublic(bundle, OPTIONS)).toThrow(
      PublicProjectionRefusedError,
    );
  });

  it('still applies the field allowlist even when the source bundle is already classification: public', () => {
    const bundle = baseBundle({ metadata: { ...baseBundle().metadata, classification: 'public' } });
    const result = projectCanonicalBundleToPublic(bundle, OPTIONS);
    const project = result.bundle.datasets.projects[0] as unknown as Record<string, unknown>;
    expect(project.description).toBeUndefined();
  });

  it('records field-removed and record-removed entries in the projection report with a reason', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    const fieldRemoved = result.report.entries.find(
      (e) =>
        e.kind === 'field-removed' && e.entityKind === 'projects' && e.fieldName === 'description',
    );
    expect(fieldRemoved?.reason).toBeTruthy();
    const recordRemoved = result.report.entries.find(
      (e) => e.kind === 'record-removed' && e.entityKind === 'evidence',
    );
    expect(recordRemoved?.reason).toBeTruthy();
  });

  it('never writes removed sensitive field VALUES into the report — only field names/reasons', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    const serializedReport = JSON.stringify(result.report);
    expect(serializedReport).not.toContain('person-123');
    expect(serializedReport).not.toContain('internal description');
  });

  it('sets the output bundle classification to public', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    expect(result.bundle.metadata.classification).toBe('public');
  });

  it('manifest reports before/after counts and field/record removal counts', () => {
    const result = projectCanonicalBundleToPublic(baseBundle(), OPTIONS);
    expect(result.manifest.recordCountsBefore.evidence).toBe(2);
    expect(result.manifest.recordCountsAfter.evidence).toBe(1);
    expect(result.manifest.recordRemovalCounts.evidence).toBe(1);
    expect(result.manifest.fieldRemovalCounts.projects).toBeGreaterThan(0);
  });
});
