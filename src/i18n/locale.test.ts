import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  isLocale,
  parseLocaleFromSearch,
  persistLocale,
  readPersistedLocale,
  resolveInitialLocale,
  urlWithLocale,
} from './locale';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('isLocale', () => {
  it('accepts only vi/en', () => {
    expect(isLocale('vi')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe('parseLocaleFromSearch', () => {
  it('reads a valid ?lang= value', () => {
    expect(parseLocaleFromSearch('?lang=en')).toBe('en');
    expect(parseLocaleFromSearch('?lang=vi')).toBe('vi');
  });

  it('ignores an invalid or missing lang param', () => {
    expect(parseLocaleFromSearch('?lang=fr')).toBeNull();
    expect(parseLocaleFromSearch('?view=3d')).toBeNull();
    expect(parseLocaleFromSearch('')).toBeNull();
  });

  it('composes with other dashboard query params without interference', () => {
    expect(parseLocaleFromSearch('?view=map&lang=en&mode=overview')).toBe('en');
  });
});

describe('persisted locale round-trip', () => {
  it('persists and reads back a locale', () => {
    const storage = memoryStorage();
    persistLocale('en', storage);
    expect(readPersistedLocale(storage)).toBe('en');
  });

  it('returns null for a missing or invalid stored value', () => {
    expect(readPersistedLocale(memoryStorage())).toBeNull();
    expect(readPersistedLocale(memoryStorage({ 'daklak-dashboard.locale': 'fr' }))).toBeNull();
  });

  it('never throws even if storage access itself throws (privacy mode)', () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(() => readPersistedLocale(throwingStorage)).not.toThrow();
    expect(readPersistedLocale(throwingStorage)).toBeNull();
    expect(() => persistLocale('en', throwingStorage)).not.toThrow();
  });
});

describe('resolveInitialLocale — priority: URL > persisted > default', () => {
  it('URL wins over a persisted preference', () => {
    const storage = memoryStorage({ 'daklak-dashboard.locale': 'en' });
    expect(resolveInitialLocale('?lang=vi', storage)).toBe('vi');
  });

  it('falls back to the persisted preference when the URL has no lang param', () => {
    const storage = memoryStorage({ 'daklak-dashboard.locale': 'en' });
    expect(resolveInitialLocale('?view=3d', storage)).toBe('en');
  });

  it('falls back to the hard default when neither URL nor storage has a locale', () => {
    expect(resolveInitialLocale('?view=3d', memoryStorage())).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe('vi');
  });
});

describe('urlWithLocale', () => {
  it('sets lang while preserving every other query param', () => {
    expect(urlWithLocale('en', '?view=map&mode=overview', '')).toBe(
      '?view=map&mode=overview&lang=en',
    );
  });

  it('preserves the hash route verbatim', () => {
    expect(urlWithLocale('en', '?view=3d', '#/projects/prj-001')).toBe(
      '?view=3d&lang=en#/projects/prj-001',
    );
  });

  it('overwrites an existing lang value rather than duplicating the param', () => {
    const result = urlWithLocale('vi', '?lang=en&view=3d', '');
    expect(result).toBe('?lang=vi&view=3d');
    expect([...new URLSearchParams(result.slice(1)).getAll('lang')]).toEqual(['vi']);
  });
});
