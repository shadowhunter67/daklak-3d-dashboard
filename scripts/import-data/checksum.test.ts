import { describe, expect, it } from 'vitest';
import {
  computeInputPackageChecksum,
  computeNormalizedContentChecksum,
  stableStringify,
} from './checksum';

describe('stableStringify', () => {
  it('is insensitive to object key order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
  it('preserves array element order (not a business decision to reorder)', () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });
});

describe('computeNormalizedContentChecksum', () => {
  it('is stable across repeated calls with equivalent content', () => {
    const a = computeNormalizedContentChecksum({ x: 1, y: [1, 2, 3] });
    const b = computeNormalizedContentChecksum({ y: [1, 2, 3], x: 1 });
    expect(a).toBe(b);
  });
  it('changes when business content changes', () => {
    const a = computeNormalizedContentChecksum({ x: 1 });
    const b = computeNormalizedContentChecksum({ x: 2 });
    expect(a).not.toBe(b);
  });
});

describe('computeInputPackageChecksum', () => {
  it('is independent of input array order (sorted internally by relativePath)', () => {
    const files = [
      { relativePath: 'b.csv', byteSize: 2, sha256: 'bb' },
      { relativePath: 'a.csv', byteSize: 1, sha256: 'aa' },
    ];
    const reversed = [...files].reverse();
    expect(computeInputPackageChecksum(files)).toBe(computeInputPackageChecksum(reversed));
  });
  it('changes when any file byte content changes', () => {
    const before = computeInputPackageChecksum([
      { relativePath: 'a.csv', byteSize: 1, sha256: 'aa' },
    ]);
    const after = computeInputPackageChecksum([
      { relativePath: 'a.csv', byteSize: 1, sha256: 'ab' },
    ]);
    expect(before).not.toBe(after);
  });
});
