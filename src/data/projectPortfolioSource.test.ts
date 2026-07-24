import { describe, expect, it } from 'vitest';
import { MOCK_PROJECT_BUNDLES } from '../entities/project/illustrativeProjectPortfolio';
import { BundledProjectPortfolioSource } from './projectPortfolioSource';

describe('BundledProjectPortfolioSource', () => {
  it('resolves ok with the mock portfolio and a non-empty administrative code set', async () => {
    const result = await new BundledProjectPortfolioSource().loadPortfolio();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.bundles).toBe(MOCK_PROJECT_BUNDLES);
    expect(result.data.validAdministrativeCodes.size).toBeGreaterThan(0);
    expect(Number.isNaN(new Date(result.data.provenance.effectiveAt).getTime())).toBe(false);
    expect(Number.isNaN(new Date(result.data.provenance.sourcePublishedAt).getTime())).toBe(false);
    expect(Number.isNaN(new Date(result.data.provenance.retrievedAt).getTime())).toBe(false);
    expect(Number.isNaN(new Date(result.data.provenance.publishedToDashboardAt).getTime())).toBe(
      false,
    );
    expect(Number.isNaN(new Date(result.data.provenance.loadedInBrowserAt).getTime())).toBe(false);
  });
});
