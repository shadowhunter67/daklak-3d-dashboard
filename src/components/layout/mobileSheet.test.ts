import { describe, expect, it } from 'vitest';
import { initialMobileSheet, reduceMobileSheet } from './mobileSheet';

describe('mobile sheet state', () => {
  it('opens a new selection at peek without expanding it', () => {
    expect(reduceMobileSheet(initialMobileSheet, { type: 'select' })).toEqual({
      state: 'peek',
      content: 'selection',
    });
  });

  it('toggles between peek and expanded', () => {
    const peek = reduceMobileSheet(initialMobileSheet, { type: 'select' });
    const expanded = reduceMobileSheet(peek, { type: 'toggle' });
    expect(expanded.state).toBe('expanded');
    expect(reduceMobileSheet(expanded, { type: 'toggle' }).state).toBe('peek');
  });

  it('returns to non-empty summary content after clearing selection', () => {
    const selection = reduceMobileSheet(initialMobileSheet, { type: 'select' });
    expect(reduceMobileSheet(selection, { type: 'clear-selection' })).toEqual({
      state: 'closed',
      content: 'summary',
    });
  });
});
