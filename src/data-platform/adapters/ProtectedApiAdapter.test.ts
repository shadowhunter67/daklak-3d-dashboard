import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ValidationResult } from './types';
import type { AccessTokenProvider } from './ProtectedApiAdapter';
import { ProtectedApiAdapter } from './ProtectedApiAdapter';

interface Shape {
  secretValue: number;
}

function validate(data: unknown): ValidationResult<Shape> {
  if (typeof data === 'object' && data !== null && typeof (data as Shape).secretValue === 'number')
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

function fakeTokenProvider(token: string | null): AccessTokenProvider {
  return { getAccessToken: () => Promise.resolve(token) };
}

describe('ProtectedApiAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('errors without calling fetch when no token is available', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new ProtectedApiAdapter({
      datasetId: 'ds',
      url: 'https://api.internal.example/data',
      tokenProvider: fakeTokenProvider(null),
      validate,
    });
    const result = await adapter.load();
    expect(result.status).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the token as a Bearer header and returns ok on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { secretValue: 7 }));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new ProtectedApiAdapter({
      datasetId: 'ds',
      url: 'https://api.internal.example/data',
      tokenProvider: fakeTokenProvider('token-123'),
      validate,
    });
    const result = await adapter.load();
    expect(result).toEqual({ status: 'ok', data: { secretValue: 7 } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('calls onUnauthorized on a 401 without retrying', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, {})));
    const onUnauthorized = vi.fn();
    const adapter = new ProtectedApiAdapter({
      datasetId: 'ds',
      url: 'https://api.internal.example/data',
      tokenProvider: fakeTokenProvider('expired'),
      onUnauthorized,
      validate,
    });
    const result = await adapter.load();
    expect(result.status).toBe('error');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('calls onForbidden on a 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(403, {})));
    const onForbidden = vi.fn();
    const adapter = new ProtectedApiAdapter({
      datasetId: 'ds',
      url: 'https://api.internal.example/data',
      tokenProvider: fakeTokenProvider('valid-but-insufficient-role'),
      onForbidden,
      validate,
    });
    const result = await adapter.load();
    expect(result.status).toBe('error');
    expect(onForbidden).toHaveBeenCalledTimes(1);
  });

  it('never logs the response body to the console', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { secretValue: 999 })));
    const adapter = new ProtectedApiAdapter({
      datasetId: 'ds',
      url: 'https://api.internal.example/data',
      tokenProvider: fakeTokenProvider('token'),
      validate,
    });
    await adapter.load();
    for (const call of logSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('999');
    }
  });

  it('rejects a non-HTTPS url without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new ProtectedApiAdapter({
      datasetId: 'ds',
      url: 'http://api.internal.example/data',
      tokenProvider: fakeTokenProvider('token'),
      validate,
    });
    const result = await adapter.load();
    expect(result.status).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
