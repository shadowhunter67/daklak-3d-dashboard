import { describe, expect, it } from 'vitest';
import { getWardBounds } from './wardBounds';

describe('getWardBounds', () => {
  it('returns lon/lat bounds inside Đắk Lắk province for a real ward code', () => {
    const bounds = getWardBounds('24580');
    expect(bounds).not.toBeNull();
    expect(bounds!.west).toBeLessThan(bounds!.east);
    expect(bounds!.south).toBeLessThan(bounds!.north);
    // Đắk Lắk's real geographic envelope, generously padded.
    expect(bounds!.west).toBeGreaterThan(107);
    expect(bounds!.east).toBeLessThan(109.5);
    expect(bounds!.south).toBeGreaterThan(11.5);
    expect(bounds!.north).toBeLessThan(13.5);
  });

  it('returns null for an unknown code', () => {
    expect(getWardBounds('not-a-real-code')).toBeNull();
  });

  it('memoizes: repeat calls for the same code return an equal (though not necessarily identical) result', () => {
    const first = getWardBounds('24133');
    const second = getWardBounds('24133');
    expect(second).toEqual(first);
  });
});
