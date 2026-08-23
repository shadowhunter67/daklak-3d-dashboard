import { describe, expect, it } from 'vitest';
import { validateTourismDestination } from './validateTourismDestination';
import type { TourismDestination } from '../types';

function makeValid(overrides: Partial<TourismDestination> = {}): TourismDestination {
  return {
    id: 'test-destination',
    name: 'Test Destination',
    category: 'lake',
    description: 'A valid test description.',
    coordinates: [108.0, 12.5],
    sourceUrl: 'https://vi.wikipedia.org/wiki/Test',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'test-owner',
    ...overrides,
  };
}

describe('validateTourismDestination', () => {
  it('accepts a fully valid record with no image fields', () => {
    expect(validateTourismDestination(makeValid())).toEqual([]);
  });

  it('accepts a fully valid record with image fields present together', () => {
    expect(
      validateTourismDestination(
        makeValid({
          imageUrl: 'https://commons.wikimedia.org/wiki/File:Test.JPG',
          imageAttribution: 'Wikimedia Commons',
          imageLicense: 'CC BY-SA 3.0',
        }),
      ),
    ).toEqual([]);
  });

  it('rejects empty id/name/description', () => {
    expect(validateTourismDestination(makeValid({ id: '  ' }))).toContain('id không được rỗng');
    expect(validateTourismDestination(makeValid({ name: '' }))).toContain('name không được rỗng');
    expect(validateTourismDestination(makeValid({ description: ' ' }))).toContain(
      'description không được rỗng',
    );
  });

  it('rejects an invalid category', () => {
    const errors = validateTourismDestination(
      makeValid({ category: 'invalid-category' as TourismDestination['category'] }),
    );
    expect(errors.some((e) => e.includes('category'))).toBe(true);
  });

  it('rejects non-finite coordinates', () => {
    const errors = validateTourismDestination(makeValid({ coordinates: [Number.NaN, 12.5] }));
    expect(errors.some((e) => e.includes('coordinates'))).toBe(true);
  });

  it('rejects coordinates outside the Đắk Lắk bbox', () => {
    const errors = validateTourismDestination(makeValid({ coordinates: [0, 0] }));
    expect(errors.some((e) => e.includes('bbox'))).toBe(true);
  });

  it('rejects a non-https sourceUrl', () => {
    expect(
      validateTourismDestination(makeValid({ sourceUrl: 'http://vi.wikipedia.org/wiki/Test' })),
    ).toContain('sourceUrl phải là một https URL không rỗng');
  });

  it('rejects an empty sourceUrl', () => {
    expect(validateTourismDestination(makeValid({ sourceUrl: '' }))).toContain(
      'sourceUrl phải là một https URL không rỗng',
    );
  });

  it('rejects an unparsable sourceUrl', () => {
    expect(
      validateTourismDestination(makeValid({ sourceUrl: 'not a url' })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects imageUrl without imageAttribution/imageLicense', () => {
    const errors = validateTourismDestination(
      makeValid({ imageUrl: 'https://commons.wikimedia.org/wiki/File:Test.JPG' }),
    );
    expect(errors).toContain('imageAttribution bắt buộc khi có imageUrl');
    expect(errors).toContain('imageLicense bắt buộc và phải hợp lệ khi có imageUrl');
  });

  it('rejects imageAttribution/imageLicense present without imageUrl', () => {
    const errors = validateTourismDestination(
      makeValid({ imageAttribution: 'Someone', imageLicense: 'CC BY-SA 3.0' }),
    );
    expect(errors).toContain('imageAttribution/imageLicense chỉ hợp lệ khi có imageUrl');
  });

  it('rejects an invalid confidence/verificationStatus', () => {
    const errors = validateTourismDestination(
      makeValid({
        confidence: 'bogus' as TourismDestination['confidence'],
        verificationStatus: 'bogus' as TourismDestination['verificationStatus'],
      }),
    );
    expect(errors.some((e) => e.includes('confidence'))).toBe(true);
    expect(errors.some((e) => e.includes('verificationStatus'))).toBe(true);
  });

  it('rejects an empty dataOwner', () => {
    expect(validateTourismDestination(makeValid({ dataOwner: '' }))).toContain(
      'dataOwner không được rỗng',
    );
  });
});
