import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO,
  ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON,
  resolveActivePortfolioSourceModule,
} from './resolveActivePortfolioSourceModule';

describe('resolveActivePortfolioSourceModule', () => {
  it('maps demo to the illustrative module', () => {
    expect(resolveActivePortfolioSourceModule('demo')).toBe(ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO);
  });

  it('maps internal-static and public-static to the SAME generated-json module (Phase 2 — no public projection yet)', () => {
    expect(resolveActivePortfolioSourceModule('internal-static')).toBe(
      ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON,
    );
    expect(resolveActivePortfolioSourceModule('public-static')).toBe(
      ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON,
    );
  });

  it('never maps two different modes to the same module as demo (demo must stay isolated)', () => {
    expect(resolveActivePortfolioSourceModule('internal-static')).not.toBe(
      ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO,
    );
  });
});
