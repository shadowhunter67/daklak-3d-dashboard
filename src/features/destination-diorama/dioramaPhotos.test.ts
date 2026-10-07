// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import { destinationPhotoUrl } from './dioramaPhotos';

const PHOTO_DIR = resolve(__dirname, '../../../public/images/destinations');

describe('destination reference photos', () => {
  const withPhoto = verifiedTourismDestinations.filter((d) => d.imageUrl);

  it('has a compressed local JPEG for every destination that links a free photo, and no strays', () => {
    const files = readdirSync(PHOTO_DIR).sort();
    expect(files).toEqual(withPhoto.map((d) => `${d.id}.jpg`).sort());
  });

  it('keeps each file a small JPEG (≤ 130 KB) so the build budget stays honest', () => {
    for (const destination of withPhoto) {
      const file = resolve(PHOTO_DIR, `${destination.id}.jpg`);
      expect(existsSync(file), destination.id).toBe(true);
      expect(statSync(file).size, destination.id).toBeLessThan(130 * 1024);
      const head = readFileSync(file).subarray(0, 2);
      expect([head[0], head[1]], destination.id).toEqual([0xff, 0xd8]);
    }
  });

  it('builds a base-relative same-origin URL (CSP img-src self)', () => {
    const url = destinationPhotoUrl('ho-lak');
    expect(url.endsWith('images/destinations/ho-lak.jpg')).toBe(true);
    expect(url).not.toMatch(/^https?:/);
  });

  it('every linked photo carries an attribution and a licence the data model accepts', () => {
    for (const destination of withPhoto) {
      expect(destination.imageAttribution, destination.id).toMatch(/Wikimedia Commons/);
      expect(destination.imageLicense, destination.id).toMatch(/^CC BY/);
    }
  });
});
