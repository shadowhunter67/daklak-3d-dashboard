import { describe, expect, it } from 'vitest';
import { MOCK_PROJECT_BUNDLES } from '../entities/project/illustrativeProjectPortfolio';
import {
  BundledProjectPortfolioSource,
  IllustrativeProjectPortfolioSource,
} from './projectPortfolioSource';

describe('IllustrativeProjectPortfolioSource', () => {
  it('resolves ok with the mock portfolio and a non-empty administrative code set', async () => {
    const result = await new IllustrativeProjectPortfolioSource().loadPortfolio();
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

  it('marks its metadata as illustrative, compatible only with the demo data mode', () => {
    const metadata = new IllustrativeProjectPortfolioSource().getMetadata();
    expect(metadata.sourceKind).toBe('illustrative');
    expect(metadata.isIllustrative).toBe(true);
    expect(metadata.deploymentCompatibility).toEqual(['demo']);
    expect(metadata.datasetIds.length).toBeGreaterThan(0);
  });

  it('embeds the same metadata inside a successful loadPortfolio() result', async () => {
    const source = new IllustrativeProjectPortfolioSource();
    const result = await source.loadPortfolio();
    if (result.status !== 'ok') throw new Error('expected ok');
    expect(result.data.metadata).toEqual(source.getMetadata());
  });

  it('keeps the pre-Phase-2 BundledProjectPortfolioSource alias working for backward compatibility', () => {
    expect(BundledProjectPortfolioSource).toBe(IllustrativeProjectPortfolioSource);
  });
});
