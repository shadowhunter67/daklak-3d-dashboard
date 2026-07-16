import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from './search';

describe('accessible directory search normalization', () => {
  it.each([
    ['Đắk Liêng', 'dak lieng'],
    ['Đồng Xuân', 'dong xuan'],
    ['BUÔN MA THUỘT', 'buon ma thuot'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });
});
