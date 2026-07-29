import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO,
  ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON,
  ACTIVE_PORTFOLIO_SOURCE_MODULE_PUBLIC_PROJECTED,
  resolveActivePortfolioSourceModule,
} from './resolveActivePortfolioSourceModule';

describe('resolveActivePortfolioSourceModule', () => {
  it('maps demo to the illustrative module', () => {
    expect(resolveActivePortfolioSourceModule('demo')).toBe(ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO);
  });

  it('maps internal-static to the generated-json module', () => {
    expect(resolveActivePortfolioSourceModule('internal-static')).toBe(
      ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON,
    );
  });

  it('maps public-static to its OWN public-projected module (Phase 6 — no longer shares internal-static)', () => {
    expect(resolveActivePortfolioSourceModule('public-static')).toBe(
      ACTIVE_PORTFOLIO_SOURCE_MODULE_PUBLIC_PROJECTED,
    );
  });

  it('every mode maps to a distinct module (demo / internal-static / public-static never share)', () => {
    const modules = [
      resolveActivePortfolioSourceModule('demo'),
      resolveActivePortfolioSourceModule('internal-static'),
      resolveActivePortfolioSourceModule('public-static'),
    ];
    expect(new Set(modules).size).toBe(3);
  });
});
