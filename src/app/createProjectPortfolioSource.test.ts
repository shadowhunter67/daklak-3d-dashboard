import { describe, expect, it } from 'vitest';
import { IllustrativeProjectPortfolioSource } from '../data/projectPortfolioSource';
import { defaultProjectPortfolioSource } from './createProjectPortfolioSource';

describe('defaultProjectPortfolioSource (composition root singleton)', () => {
  it('implements the ProjectPortfolioSource contract (loadPortfolio + getMetadata)', () => {
    expect(typeof defaultProjectPortfolioSource.loadPortfolio).toBe('function');
    expect(typeof defaultProjectPortfolioSource.getMetadata).toBe('function');
  });

  it("resolves to the illustrative source under Vitest's mode (falls back to the safe 'demo' default)", () => {
    // vite.config.ts's `#active-portfolio-source` alias resolves per Vite/Vitest `mode` — Vitest's
    // own implicit mode ('test') is one of the three values that falls back to 'demo' (see
    // portfolioDataModes.test.ts), so this singleton is the illustrative source in every test run.
    expect(defaultProjectPortfolioSource).toBeInstanceOf(IllustrativeProjectPortfolioSource);
    expect(defaultProjectPortfolioSource.getMetadata().isIllustrative).toBe(true);
  });
});
