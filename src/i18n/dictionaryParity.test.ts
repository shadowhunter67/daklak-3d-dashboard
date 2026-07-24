import { describe, expect, it } from 'vitest';
import { vi } from './messages/vi';
import { en } from './messages/en';

/**
 * `vi.ts` is the source-of-truth key set (`MessageKey = keyof typeof vi`, see messages.ts) and
 * `en.ts` is a `Partial` of it — but "partial because a key hasn't been translated yet" and
 * "partial because someone typo'd a key that silently falls back to Vietnamese forever" look
 * identical at the type level. This test is the real guardrail: every `vi` key must have an `en`
 * counterpart (parity), every `en` key must exist in `vi` (no orphaned/renamed keys), and every
 * `{placeholder}` interpolation token must match between the two so a translated string can never
 * silently drop or rename a variable the code passes in.
 */

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

function placeholders(template: string): Set<string> {
  return new Set([...template.matchAll(PLACEHOLDER_PATTERN)].map((m) => m[1]));
}

function setEquals(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((item) => b.has(item));
}

describe('i18n dictionary parity (vi.ts source-of-truth vs en.ts)', () => {
  const viKeys = Object.keys(vi);
  const enKeys = Object.keys(en);

  it('has no duplicate keys in vi.ts (object literal would silently keep only the last one)', () => {
    expect(new Set(viKeys).size).toBe(viKeys.length);
  });

  it('has no duplicate keys in en.ts', () => {
    expect(new Set(enKeys).size).toBe(enKeys.length);
  });

  it('every key in en.ts exists in vi.ts — no orphaned/renamed English-only key', () => {
    const missingFromVi = enKeys.filter((key) => !(key in vi));
    expect(missingFromVi, `keys only in en.ts: ${missingFromVi.join(', ')}`).toEqual([]);
  });

  it('every key in vi.ts has an English translation in en.ts — no silently-untranslated key', () => {
    const missingFromEn = viKeys.filter((key) => !(key in en));
    expect(
      missingFromEn,
      `keys missing an English translation (falls back to Vietnamese forever): ${missingFromEn.join(', ')}`,
    ).toEqual([]);
  });

  it('interpolation placeholders match exactly between vi and en for every shared key', () => {
    const mismatches: string[] = [];
    for (const key of viKeys) {
      const enValue = (en as Record<string, string>)[key];
      if (enValue === undefined) continue;
      const viPlaceholders = placeholders((vi as Record<string, string>)[key]);
      const enPlaceholders = placeholders(enValue);
      if (!setEquals(viPlaceholders, enPlaceholders)) {
        mismatches.push(
          `${key}: vi has {${[...viPlaceholders].join(',')}}, en has {${[...enPlaceholders].join(',')}}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('no key resolves to an empty string in either dictionary', () => {
    const emptyVi = viKeys.filter((key) => (vi as Record<string, string>)[key].trim() === '');
    const emptyEn = enKeys.filter((key) => (en as Record<string, string>)[key].trim() === '');
    expect(emptyVi, `empty vi.ts values: ${emptyVi.join(', ')}`).toEqual([]);
    expect(emptyEn, `empty en.ts values: ${emptyEn.join(', ')}`).toEqual([]);
  });
});
