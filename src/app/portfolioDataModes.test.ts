import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PORTFOLIO_DATA_MODE,
  isPortfolioDeploymentMode,
  resolvePortfolioDataModeFromViteMode,
} from './portfolioDataModes';

describe('isPortfolioDeploymentMode', () => {
  it('accepts exactly the three documented modes', () => {
    expect(isPortfolioDeploymentMode('demo')).toBe(true);
    expect(isPortfolioDeploymentMode('internal-static')).toBe(true);
    expect(isPortfolioDeploymentMode('public-static')).toBe(true);
  });

  it('rejects anything else, including near-miss typos', () => {
    expect(isPortfolioDeploymentMode('internall-static')).toBe(false);
    expect(isPortfolioDeploymentMode('')).toBe(false);
    expect(isPortfolioDeploymentMode('secure')).toBe(false); // the OTHER (auth) axis's term
  });
});

describe('resolvePortfolioDataModeFromViteMode', () => {
  it("falls back to the safe default ('demo') for Vite/Vitest's own implicit modes", () => {
    expect(resolvePortfolioDataModeFromViteMode('development')).toBe(DEFAULT_PORTFOLIO_DATA_MODE);
    expect(resolvePortfolioDataModeFromViteMode('production')).toBe(DEFAULT_PORTFOLIO_DATA_MODE);
    expect(resolvePortfolioDataModeFromViteMode('test')).toBe(DEFAULT_PORTFOLIO_DATA_MODE);
  });

  it('passes through an explicit, valid data mode unchanged', () => {
    expect(resolvePortfolioDataModeFromViteMode('internal-static')).toBe('internal-static');
    expect(resolvePortfolioDataModeFromViteMode('public-static')).toBe('public-static');
    expect(resolvePortfolioDataModeFromViteMode('demo')).toBe('demo');
  });

  it('throws — does not silently pick another mode — for an unrecognized explicit --mode', () => {
    expect(() => resolvePortfolioDataModeFromViteMode('internall-static')).toThrow(
      /không phải data mode hợp lệ/,
    );
    expect(() => resolvePortfolioDataModeFromViteMode('secure')).toThrow();
  });
});
