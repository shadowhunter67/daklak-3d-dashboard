// @vitest-environment node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import { DESTINATION_PANORAMAS, destinationPanorama, panoramaUrl } from './panoramas';

const DIR = resolve(__dirname, '../../../public/panoramas');
const ids = new Set(verifiedTourismDestinations.map((d) => d.id));

describe('destination 360° panoramas', () => {
  it('only registers real destinations and every file exists, is a JPEG ≤ 6 MB and has no strays', () => {
    const registered = Object.entries(DESTINATION_PANORAMAS);
    for (const [id, p] of registered) {
      expect(ids.has(id), id).toBe(true);
      const file = resolve(DIR, p.file);
      expect(existsSync(file), p.file).toBe(true);
      expect(statSync(file).size, p.file).toBeLessThan(6 * 1024 * 1024);
      expect(p.file, id).toMatch(/\.jpe?g$/i);
    }
    const onDisk = existsSync(DIR) ? readdirSync(DIR).filter((f) => !f.startsWith('.')) : [];
    expect(onDisk.sort()).toEqual(registered.map(([, p]) => p.file).sort());
  });

  it('requires attribution, a licence and a source link for every panorama', () => {
    for (const [id, p] of Object.entries(DESTINATION_PANORAMAS)) {
      expect(p.attribution.trim(), id).not.toBe('');
      expect(p.license.trim(), id).not.toBe('');
      expect(p.sourceUrl, id).toMatch(/^https:\/\//);
    }
  });

  it('returns nothing for a destination without a panorama and builds a same-origin URL', () => {
    expect(destinationPanorama('does-not-exist')).toBeUndefined();
    expect(panoramaUrl('x.jpg').endsWith('panoramas/x.jpg')).toBe(true);
    expect(panoramaUrl('x.jpg')).not.toMatch(/^https?:/);
  });
});
