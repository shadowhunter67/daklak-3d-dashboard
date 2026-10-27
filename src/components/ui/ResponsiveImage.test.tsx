import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MediaItem } from '../../entities/media/mediaItem';
import { ResponsiveImage } from './ResponsiveImage';

const item: MediaItem = {
  id: 'ho-lak',
  title: 'Hồ Lắk',
  src: 'images/destinations/ho-lak.jpg',
  thumbnail: 'images/destinations/thumb/ho-lak.webp',
  width: 640,
  height: 480,
  thumbnailWidth: 320,
  thumbnailHeight: 240,
  author: 'A',
  license: 'CC BY-SA 3.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Holak02.JPG',
  description: 'd',
  representativeType: 'destination-in-unit',
};

afterEach(cleanup);

describe('ResponsiveImage', () => {
  it('thumbnail: <picture> với nguồn WebP có srcset w-descriptor, ảnh dự phòng JPEG, có width/height và tải lười', () => {
    const { container } = render(<ResponsiveImage item={item} alt="Ảnh Hồ Lắk" />);
    const source = container.querySelector('picture source')!;
    expect(source.getAttribute('type')).toBe('image/webp');
    expect(source.getAttribute('srcset')).toMatch(/thumb\/ho-lak\.webp 320w$/);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/images\/destinations\/ho-lak\.jpg$/);
    expect(img.getAttribute('width')).toBe('320');
    expect(img.getAttribute('height')).toBe('240');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('alt')).toBe('Ảnh Hồ Lắk');
  });

  it('full: ảnh đầy đủ có width/height của ảnh gốc, không dùng <picture>', () => {
    const { container } = render(<ResponsiveImage item={item} variant="full" alt="x" />);
    expect(container.querySelector('picture')).toBeNull();
    const img = container.querySelector('img')!;
    expect(img.getAttribute('width')).toBe('640');
    expect(img.getAttribute('height')).toBe('480');
  });

  it('đường dẫn luôn cùng nguồn gốc (không http)', () => {
    const { container } = render(<ResponsiveImage item={item} alt="x" />);
    for (const node of container.querySelectorAll('img, source')) {
      const value = node.getAttribute('src') ?? node.getAttribute('srcset') ?? '';
      expect(value).not.toMatch(/^https?:/);
    }
  });
});
