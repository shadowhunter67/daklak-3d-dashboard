import { describe, expect, it } from 'vitest';
import { MOCK_PROJECT_BUNDLES } from '../entities/project/mockPortfolio';
import { BundledProjectPortfolioSource } from './projectPortfolioSource';

describe('BundledProjectPortfolioSource', () => {
  it('resolves ok with the mock portfolio and a non-empty administrative code set', async () => {
    const result = await new BundledProjectPortfolioSource().loadPortfolio();
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.bundles).toBe(MOCK_PROJECT_BUNDLES);
    expect(result.data.validAdministrativeCodes.size).toBeGreaterThan(0);
    expect(Number.isNaN(new Date(result.data.loadedAt).getTime())).toBe(false);
  });
});
