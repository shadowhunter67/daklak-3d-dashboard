import { describe, expect, it } from 'vitest';
import { checksumOf } from './checksum.mjs';

describe('checksumOf', () => {
  it('is deterministic for the same logical content', () => {
    expect(checksumOf({ a: 1, b: 2 })).toBe(checksumOf({ a: 1, b: 2 }));
  });

  it('is independent of object key order', () => {
    expect(checksumOf({ a: 1, b: 2 })).toBe(checksumOf({ b: 2, a: 1 }));
  });

  it('differs when the content actually differs', () => {
    expect(checksumOf({ a: 1 })).not.toBe(checksumOf({ a: 2 }));
  });

  it('is sensitive to array order (arrays are not sorted, only object keys are)', () => {
    expect(checksumOf([1, 2])).not.toBe(checksumOf([2, 1]));
  });

  it('handles nested structures consistently regardless of nested key order', () => {
    const a = { records: [{ id: '1', name: 'x' }], meta: { total: 1 } };
    const b = { meta: { total: 1 }, records: [{ name: 'x', id: '1' }] };
    expect(checksumOf(a)).toBe(checksumOf(b));
  });
});
