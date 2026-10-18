import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateMediaManifest } from './media';
import type { MediaSource } from './media';

const ok: MediaSource = {
  id: 'm1',
  subject: 'Hồ Lắk',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
  provider: 'Wikimedia Commons',
  author: 'A. Tác giả',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  retrievedAt: '2026-10-18T00:00:00.000Z',
  localAsset: 'media/m1.jpg',
  usage: 'production',
};
const rules = (items: MediaSource[]) => validateMediaManifest(items).map((i) => i.rule);

describe('validateMediaManifest', () => {
  it('ảnh production đủ license + tác giả → hợp lệ', () => {
    expect(validateMediaManifest([ok])).toEqual([]);
  });

  it('ảnh production thiếu license bị chặn', () => {
    expect(rules([{ ...ok, license: '' }])).toContain('media-missing-license');
  });

  it('ảnh production thiếu asset cục bộ bị chặn (không hotlink)', () => {
    expect(rules([{ ...ok, localAsset: undefined }])).toContain('media-production-without-asset');
  });

  it('license cần ghi tác giả (CC BY) mà thiếu author thì chặn', () => {
    expect(rules([{ ...ok, author: undefined }])).toContain('media-missing-attribution');
  });

  it('ảnh reference-only không được có asset cục bộ', () => {
    expect(rules([{ ...ok, usage: 'reference-only' }])).toContain('media-reference-has-asset');
  });

  it('bắt id trùng và URL không https', () => {
    expect(rules([ok, ok])).toContain('duplicate-media-id');
    expect(rules([{ ...ok, id: 'm2', sourceUrl: 'http://x' }])).toContain('invalid-media-url');
  });
});

describe('import boundary', () => {
  it('domain nghiên cứu không import GIS asset, UI hay store', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const forbidden = [/assets\/maps\//, /\bcomponents\//, /\bstores\//, /\.css['"]/];
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const text = readFileSync(join(dir, f), 'utf8');
      for (const re of forbidden) expect(text, `${f} ${re}`).not.toMatch(re);
    }
  });
});

describe('config/media-sources.json thật', () => {
  it('qua validator và mọi ảnh production có file cục bộ', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const manifest = JSON.parse(
      readFileSync(join(dir, '..', '..', '..', 'config', 'media-sources.json'), 'utf8'),
    ) as { items: MediaSource[] };
    expect(validateMediaManifest(manifest.items)).toEqual([]);
    for (const m of manifest.items.filter((i) => i.usage === 'production'))
      expect(existsSync(join(dir, '..', '..', '..', 'public', m.localAsset ?? '__none__'))).toBe(
        true,
      );
  });
});
