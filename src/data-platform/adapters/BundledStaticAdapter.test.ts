import { describe, expect, it } from 'vitest';
import type { ValidationResult } from './types';
import { BundledStaticAdapter } from './BundledStaticAdapter';

interface Shape {
  value: number;
}

function validate(data: unknown): ValidationResult<Shape> {
  if (typeof data === 'object' && data !== null && typeof (data as Shape).value === 'number')
    return { valid: true, data: data as Shape };
  return { valid: false, errors: ['invalid shape'] };
}

describe('BundledStaticAdapter', () => {
  it('resolves with the validated data', async () => {
    const adapter = new BundledStaticAdapter('ds', { value: 42 }, validate);
    const result = await adapter.load();
    expect(result).toEqual({ status: 'ok', data: { value: 42 } });
  });

  it('surfaces validation failure as an error result, not a thrown exception', async () => {
    const adapter = new BundledStaticAdapter('ds', { value: 'not-a-number' }, validate);
    const result = await adapter.load();
    expect(result.status).toBe('error');
  });
});
