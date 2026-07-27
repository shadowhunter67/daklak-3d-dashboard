import { afterEach, describe, expect, it, vi } from 'vitest';

const FIXTURE_MODULE_PATH = '../assets/data/project-portfolio.generated-fixture-demo.json';

const VALID_PROJECT = {
  id: 'gen-test-001',
  code: 'GEN-TEST-001',
  name: 'Test project',
  description: 'Test',
  sector: 'transport',
  status: 'active',
  priority: 'medium',
  managingAuthorityId: 'agency-x',
  investorId: 'agency-x',
  approvedBudget: 1000,
  disbursedAmount: 100,
  overallProgress: 10,
  plannedProgress: 10,
  financialProgress: 10,
  administrativeAreaCodes: ['22165'],
  dataUpdatedAt: '2026-07-20T00:00:00.000Z',
  dataOwner: 'Test',
  sourceDatasetId: 'project-portfolio-generated-fixture-demo',
  confidence: 'medium',
  verificationStatus: 'validated-automatically',
};

const VALID_CANONICAL_BUNDLE = {
  schemaVersion: '1.0.0',
  bundleVersion: 'test-1',
  metadata: {
    generatedAt: '2026-07-20T00:00:00.000Z',
    asOf: '2026-07-20T00:00:00.000Z',
    sourceDatasetIds: ['project-portfolio-generated-fixture-demo'],
    administrativeCodeVersion: 'daklak-labels-v1',
    classification: 'public',
    producer: 'test',
  },
  datasets: {
    agencies: [],
    contractors: [],
    projects: [VALID_PROJECT],
    workPackages: [],
    milestones: [],
    projectIssues: [],
    progressSnapshots: [],
    evidence: [],
    referenceDocuments: [],
  },
};

describe('GeneratedJsonProjectPortfolioSource', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock(FIXTURE_MODULE_PATH);
  });

  it('resolves ok with the real checked-in Phase 3 canonical fixture (no mock — end-to-end sanity)', async () => {
    const { GeneratedJsonProjectPortfolioSource } =
      await import('./generatedJsonProjectPortfolioSource');
    const source = new GeneratedJsonProjectPortfolioSource();
    const result = await source.loadPortfolio();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.bundles.length).toBeGreaterThan(0);
    expect(result.data.validAdministrativeCodes.size).toBeGreaterThan(0);
    expect(result.data.metadata.sourceKind).toBe('generated-json');
    expect(result.data.metadata.isIllustrative).toBe(false);
    expect(result.data.metadata.deploymentCompatibility).toEqual(['internal-static']);
  });

  it('never claims public-static compatibility for the unfiltered Phase 3 fixture', async () => {
    const { GeneratedJsonProjectPortfolioSource } =
      await import('./generatedJsonProjectPortfolioSource');
    const metadata = new GeneratedJsonProjectPortfolioSource().getMetadata();
    expect(metadata.deploymentCompatibility).not.toContain('public-static');
  });

  it('returns a schema-invalid error, not a fallback to illustrative data, when the bundle top-level shape is malformed', async () => {
    vi.doMock(FIXTURE_MODULE_PATH, () => ({ default: { nonsense: true } }));
    const { GeneratedJsonProjectPortfolioSource } =
      await import('./generatedJsonProjectPortfolioSource');
    const result = await new GeneratedJsonProjectPortfolioSource().loadPortfolio();
    expect(result.status).toBe('error');
    if (result.status !== 'error') throw new Error('expected error');
    expect(result.error.kind).toBe('schema-invalid');
  });

  it('returns a schema-invalid error for an unsupported schemaVersion — does not parse it best-effort', async () => {
    vi.doMock(FIXTURE_MODULE_PATH, () => ({
      default: { ...VALID_CANONICAL_BUNDLE, schemaVersion: '9.9.9' },
    }));
    const { GeneratedJsonProjectPortfolioSource } =
      await import('./generatedJsonProjectPortfolioSource');
    const result = await new GeneratedJsonProjectPortfolioSource().loadPortfolio();
    expect(result.status).toBe('error');
    if (result.status !== 'error') throw new Error('expected error');
    expect(result.error.kind).toBe('unsupported-schema-version');
    expect(result.error.message).toContain('9.9.9');
  });

  it('returns degraded (not error, not silently ok) when a record fails existing domain validation', async () => {
    const invalidProject = { ...VALID_PROJECT, overallProgress: 250 }; // out of 0-100 range
    vi.doMock(FIXTURE_MODULE_PATH, () => ({
      default: {
        ...VALID_CANONICAL_BUNDLE,
        datasets: { ...VALID_CANONICAL_BUNDLE.datasets, projects: [invalidProject] },
      },
    }));
    const { GeneratedJsonProjectPortfolioSource } =
      await import('./generatedJsonProjectPortfolioSource');
    const result = await new GeneratedJsonProjectPortfolioSource().loadPortfolio();
    expect(result.status).toBe('degraded');
    if (result.status !== 'degraded') throw new Error('expected degraded');
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some((issue) => issue.includes('overallProgress'))).toBe(true);
  });

  it('groups dataset-oriented work packages/milestones/issues/snapshots back onto their project', async () => {
    const workPackage = {
      id: 'wp-1',
      projectId: 'gen-test-001',
      code: 'WP-01',
      name: 'WP',
      plannedStart: '2026-01-01',
      plannedEnd: '2026-06-01',
      plannedProgress: 10,
      actualProgress: 10,
      budget: 10,
      paidAmount: 1,
      status: 'active',
    };
    vi.doMock(FIXTURE_MODULE_PATH, () => ({
      default: {
        ...VALID_CANONICAL_BUNDLE,
        datasets: { ...VALID_CANONICAL_BUNDLE.datasets, workPackages: [workPackage] },
      },
    }));
    const { GeneratedJsonProjectPortfolioSource } =
      await import('./generatedJsonProjectPortfolioSource');
    const result = await new GeneratedJsonProjectPortfolioSource().loadPortfolio();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.bundles[0]?.workPackages).toEqual([workPackage]);
  });

  it('getMetadata() still returns sensible fallback values when the bundle shape is malformed', async () => {
    vi.doMock(FIXTURE_MODULE_PATH, () => ({ default: { nonsense: true } }));
    const { GeneratedJsonProjectPortfolioSource } =
      await import('./generatedJsonProjectPortfolioSource');
    const metadata = new GeneratedJsonProjectPortfolioSource().getMetadata();
    expect(metadata.datasetIds).toEqual([]);
    expect(metadata.schemaVersion).toBeNull();
    expect(metadata.sourceKind).toBe('generated-json');
  });
});
