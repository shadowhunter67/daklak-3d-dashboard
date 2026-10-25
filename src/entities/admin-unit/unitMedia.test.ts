import { describe, expect, it } from 'vitest';
import wards from '#province-assets/daklak-wards-render.json';
import type { TourismDestination } from '../tourism/types';
import { verifiedTourismDestinations } from '../tourism/verifiedTourismDestinations';
import type { WardCollection } from '../../types/map';
import { deriveUnitMedia } from './unitMedia';

const collection = wards as WardCollection;
const base: Omit<TourismDestination, 'id' | 'name' | 'coordinates'> = {
  category: 'lake',
  description: '',
  sourceUrl: 'https://example.org',
  confidence: 'verified',
  verificationStatus: 'reviewed',
  dataOwner: 'test',
};
const withPhoto: TourismDestination = {
  ...base,
  id: 'ho-lak',
  name: 'Hồ Lắk',
  coordinates: [108.18194, 12.42167],
  imageUrl: 'https://commons.wikimedia.org/wiki/File:Holak02.JPG',
  imageAttribution: 'Ảnh: Wikimedia Commons, File:Holak02.JPG',
  imageLicense: 'CC BY-SA 3.0',
};
const noPhoto: TourismDestination = {
  ...base,
  id: 'no-photo',
  name: 'Không ảnh',
  coordinates: [108.18194, 12.42167],
};
const outside: TourismDestination = { ...withPhoto, id: 'far', coordinates: [0, 0] };

describe('deriveUnitMedia', () => {
  it('gán ảnh điểm đến cho đơn vị chứa điểm đó, dùng file cục bộ và giữ license + ghi công', () => {
    const [media] = deriveUnitMedia([withPhoto], collection);
    expect(media).toMatchObject({
      administrativeUnitCode: '24580',
      usage: 'production',
      license: 'CC BY-SA 3.0',
      localAsset: 'images/destinations/ho-lak.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Holak02.JPG',
      subject: 'Hồ Lắk',
      viaDestinationId: 'ho-lak',
    });
    expect(media.notes).toContain('Wikimedia Commons');
  });

  it('bỏ qua điểm không có ảnh hoặc nằm ngoài mọi ranh giới; mỗi đơn vị chỉ một ảnh', () => {
    const result = deriveUnitMedia(
      [noPhoto, outside, withPhoto, { ...withPhoto, id: 'second' }],
      collection,
    );
    expect(result).toHaveLength(1);
    expect(result[0].viaDestinationId).toBe('ho-lak');
  });

  it('trên dữ liệu thật: mọi ảnh là production có license và asset cục bộ', () => {
    const result = deriveUnitMedia(verifiedTourismDestinations, collection);
    expect(result.length).toBeGreaterThan(5);
    for (const m of result) {
      expect(m.usage).toBe('production');
      expect(m.license.trim()).not.toBe('');
      expect(m.localAsset).toMatch(/^images\/destinations\/.+\.jpg$/);
    }
    expect(new Set(result.map((m) => m.administrativeUnitCode)).size).toBe(result.length);
  });
});
