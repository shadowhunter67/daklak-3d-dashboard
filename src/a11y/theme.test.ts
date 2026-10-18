import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  persistTheme,
  readPersistedTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
} from './theme';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe('theme preference', () => {
  it('defaults to light when nothing is stored', () => {
    expect(resolveInitialTheme(memoryStorage())).toBe('light');
  });

  it('round-trips a persisted choice', () => {
    const storage = memoryStorage();
    persistTheme('dark', storage);
    expect(storage.data[THEME_STORAGE_KEY]).toBe('dark');
    expect(resolveInitialTheme(storage)).toBe('dark');
  });

  it('ignores an unknown stored value', () => {
    expect(readPersistedTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'sepia' }))).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(resolveInitialTheme(blocked)).toBe('light');
    expect(() => persistTheme('dark', blocked)).not.toThrow();
  });

  it('applies the mode as data-theme on the root element', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
  });
});
