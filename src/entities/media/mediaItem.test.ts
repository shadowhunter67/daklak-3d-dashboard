// @vitest-environment node
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DESTINATION_MEDIA } from '../../data/destinationMedia';
import { verifiedTourismDestinations } from '../tourism/verifiedTourismDestinations';
import { mediaUrl, validateMediaItem, type MediaItem } from './mediaItem';

const PUBLIC = resolve(__dirname, '../../../public');

describe('validateMediaItem', () => {
  const good: MediaItem = {
    id: 'x',
    title: 'X',
    src: 'images/x.jpg',
    thumbnail: 'images/thumb/x.webp',
    width: 640,
    height: 480,
    thumbnailWidth: 320,
    thumbnailHeight: 240,
    author: 'A',
    license: 'CC BY-SA 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
    description: 'd',
    representativeType: 'destination-in-unit',
  };
  it('chấp nhận mục đủ nguồn, giấy phép, ghi công, kích thước và tệp cục bộ', () => {
    expect(validateMediaItem(good)).toEqual([]);
  });
  it('từ chối thiếu giấy phép, thiếu tác giả, hotlink, thiếu kích thước, thumbnail không phải WebP', () => {
    const issues = validateMediaItem({
      ...good,
      license: ' ',
      author: '',
      src: 'https://example.org/x.jpg',
      width: 0,
      thumbnail: 'images/x.jpg',
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        'thiếu giấy phép',
        'thiếu ghi công tác giả',
        'ảnh phải là tệp cục bộ (CSP img-src self)',
        'thiếu kích thước ảnh',
        'thumbnail phải là WebP',
      ]),
    );
  });
  it('mediaUrl ghép tiền tố base một lần', () => {
    expect(mediaUrl('/images/a.jpg', '/app/')).toBe('/app/images/a.jpg');
    expect(mediaUrl('images/a.jpg', '/app/')).toBe('/app/images/a.jpg');
  });
});

describe('DESTINATION_MEDIA (dữ liệu thật)', () => {
  const withPhoto = verifiedTourismDestinations.filter((d) => d.imageUrl);

  it('có một MediaItem cho mỗi điểm đến có ảnh, tất cả hợp lệ', () => {
    expect(DESTINATION_MEDIA.size).toBe(withPhoto.length);
    for (const item of DESTINATION_MEDIA.values()) {
      expect(validateMediaItem(item), item.id).toEqual([]);
    }
  });

  it('mọi tệp ảnh và thumbnail tồn tại; thumbnail là WebP nhỏ (<= 25KB) và đúng tỉ lệ ảnh gốc', () => {
    for (const item of DESTINATION_MEDIA.values()) {
      const full = resolve(PUBLIC, item.src);
      const thumb = resolve(PUBLIC, item.thumbnail);
      expect(existsSync(full), item.src).toBe(true);
      expect(existsSync(thumb), item.thumbnail).toBe(true);
      expect(statSync(thumb).size, item.thumbnail).toBeLessThan(25 * 1024);
      const head = readFileSync(thumb).subarray(0, 12).toString('latin1');
      expect(head.startsWith('RIFF') && head.endsWith('WEBP'), item.thumbnail).toBe(true);
      const ratio = item.width / item.height;
      expect(Math.abs(ratio - item.thumbnailWidth / item.thumbnailHeight), item.id).toBeLessThan(
        0.02,
      );
    }
  });
});
