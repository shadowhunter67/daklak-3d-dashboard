import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ValidationResult } from './types';
import { PublicHttpAdapter } from './PublicHttpAdapter';

interface Shape {
  value: number;
}

function validate(data: unknown): ValidationResult<Shape> {
  if (typeof data === 'object' && data !== null && typeof (data as Shape).value === 'number')
    return { valid: true, data: data as Shape };
  return { valid: false, errors: ['invalid shape'] };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('PublicHttpAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a non-HTTPS url without making a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PublicHttpAdapter({
      datasetId: 'ds',
      url: 'http://example.com/data.json',
      validate,
    });
    const result = await adapter.load();
    expect(result).toEqual({ status: 'error', error: 'Source URL must use HTTPS' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns ok on a successful validated response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { value: 1 })));
    const adapter = new PublicHttpAdapter({
      datasetId: 'ds',
      url: 'https://example.com/data.json',
      validate,
    });
    const result = await adapter.load();
    expect(result).toEqual({ status: 'ok', data: { value: 1 } });
  });

  it('does not retry a 4xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, {}));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PublicHttpAdapter({
      datasetId: 'ds',
      url: 'https://example.com/data.json',
      validate,
      maxRetries: 3,
    });
    const result = await adapter.load();
    expect(result.status).toBe('error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 5xx response up to maxRetries then reports degraded', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, {}));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PublicHttpAdapter({
      datasetId: 'ds',
      url: 'https://example.com/data.json',
      validate,
      maxRetries: 2,
    });
    const result = await adapter.load();
    expect(result.status).toBe('degraded');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('surfaces a schema validation failure as an error, not degraded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { value: 'nope' })));
    const adapter = new PublicHttpAdapter({
      datasetId: 'ds',
      url: 'https://example.com/data.json',
      validate,
    });
    const result = await adapter.load();
    expect(result.status).toBe('error');
  });

  it('reports degraded (not a thrown exception) when fetch rejects with a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const adapter = new PublicHttpAdapter({
      datasetId: 'ds',
      url: 'https://example.com/data.json',
      validate,
      maxRetries: 0,
    });
    const result = await adapter.load();
    expect(result).toEqual({ status: 'degraded', reason: 'network down' });
  });
});
