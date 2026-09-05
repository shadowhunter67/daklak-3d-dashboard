import { describe, expect, it, vi } from 'vitest';
import {
  applyFontScale,
  FONT_SCALE_STORAGE_KEY,
  FONT_SCALE_VALUES,
  isFontScaleStep,
  persistFontScale,
  readPersistedFontScale,
  resolveInitialFontScale,
} from './fontScale';

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    _store: store,
  };
}

describe('isFontScaleStep', () => {
  it('accepts the three valid steps and rejects anything else', () => {
    expect(isFontScaleStep('small')).toBe(true);
    expect(isFontScaleStep('default')).toBe(true);
    expect(isFontScaleStep('large')).toBe(true);
    expect(isFontScaleStep('huge')).toBe(false);
    expect(isFontScaleStep(null)).toBe(false);
    expect(isFontScaleStep(undefined)).toBe(false);
  });
});

describe('readPersistedFontScale / persistFontScale', () => {
  it('round-trips a persisted value', () => {
    const storage = fakeStorage();
    persistFontScale('large', storage);
    expect(readPersistedFontScale(storage)).toBe('large');
  });

  it('returns null when nothing is persisted', () => {
    expect(readPersistedFontScale(fakeStorage())).toBeNull();
  });

  it('returns null for a corrupted/unexpected stored value instead of throwing', () => {
    const storage = fakeStorage({ [FONT_SCALE_STORAGE_KEY]: 'not-a-real-step' });
    expect(readPersistedFontScale(storage)).toBeNull();
  });

  it('never throws when storage itself throws (privacy mode)', () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => readPersistedFontScale(throwingStorage)).not.toThrow();
    expect(readPersistedFontScale(throwingStorage)).toBeNull();
    expect(() => persistFontScale('large', throwingStorage)).not.toThrow();
  });
});

describe('resolveInitialFontScale', () => {
  it('defaults to "default" with nothing persisted', () => {
    expect(resolveInitialFontScale(fakeStorage())).toBe('default');
  });

  it('uses the persisted value when present', () => {
    expect(resolveInitialFontScale(fakeStorage({ [FONT_SCALE_STORAGE_KEY]: 'small' }))).toBe(
      'small',
    );
  });
});

describe('FONT_SCALE_VALUES', () => {
  it('is ordered small < default < large', () => {
    expect(FONT_SCALE_VALUES.small).toBeLessThan(FONT_SCALE_VALUES.default);
    expect(FONT_SCALE_VALUES.default).toBeLessThan(FONT_SCALE_VALUES.large);
  });

  it('default is exactly 1 (no scaling) — a returning visitor with no preference sees no change', () => {
    expect(FONT_SCALE_VALUES.default).toBe(1);
  });
});

describe('applyFontScale', () => {
  it('sets --user-font-scale to the numeric value for the given step', () => {
    const root = { style: { setProperty: vi.fn() } } as unknown as HTMLElement;
    applyFontScale('large', root);
    expect(root.style.setProperty).toHaveBeenCalledWith('--user-font-scale', '1.25');
  });
});
