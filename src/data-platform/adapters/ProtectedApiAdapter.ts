import type { DataLoadContext, DataLoadResult, DatasetAdapter, ValidationResult } from './types';

/**
 * Supplies a short-lived access token on demand. The default/expected implementation in a real
 * secure deployment gets this from a BFF/HttpOnly-cookie session or an identity-provider SDK — it
 * is NOT this class's job to store or refresh tokens, and nothing here ever touches
 * localStorage/sessionStorage.
 */
export interface AccessTokenProvider {
  getAccessToken(): Promise<string | null>;
}

export interface ProtectedApiAdapterOptions<T> {
  datasetId: string;
  url: string;
  tokenProvider: AccessTokenProvider;
  /** Called on HTTP 401 — e.g. to redirect to re-authentication. Never logged with response body. */
  onUnauthorized?: () => void;
  /** Called on HTTP 403 — e.g. to show "you don't have access", not a generic error. */
  onForbidden?: () => void;
  validate: (data: unknown) => ValidationResult<T>;
}

/**
 * Contract + local-mock-only implementation for `access.delivery: 'protected-api'` datasets (spec
 * §4 ProtectedApiAdapter). No backend exists for this in the repo — see
 * ProtectedApiAdapter.test.ts, which exercises this against an in-memory fake token provider and
 * fake fetch, not a real service. Never wired into the public GitHub Pages build.
 */
export class ProtectedApiAdapter<T> implements DatasetAdapter<T> {
  readonly datasetId: string;
  private readonly url: string;
  private readonly tokenProvider: AccessTokenProvider;
  private readonly onUnauthorized?: () => void;
  private readonly onForbidden?: () => void;
  private readonly validateFn: (data: unknown) => ValidationResult<T>;

  constructor(options: ProtectedApiAdapterOptions<T>) {
    this.datasetId = options.datasetId;
    this.url = options.url;
    this.tokenProvider = options.tokenProvider;
    this.onUnauthorized = options.onUnauthorized;
    this.onForbidden = options.onForbidden;
    this.validateFn = options.validate;
  }

  validate(data: unknown): ValidationResult<T> {
    return this.validateFn(data);
  }

  async load(context: DataLoadContext = {}): Promise<DataLoadResult<T>> {
    if (!this.url.startsWith('https://')) {
      return { status: 'error', error: 'Source URL must use HTTPS' };
    }
    const token = await this.tokenProvider.getAccessToken();
    if (!token) return { status: 'error', error: 'No access token available' };
    let response: Response;
    try {
      response = await fetch(this.url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: context.signal,
      });
    } catch (error) {
      return {
        status: 'degraded',
        reason: error instanceof Error ? error.message : 'network error',
      };
    }
    if (response.status === 401) {
      this.onUnauthorized?.();
      return { status: 'error', error: 'Session expired (401)' };
    }
    if (response.status === 403) {
      this.onForbidden?.();
      return { status: 'error', error: 'Access denied (403)' };
    }
    if (!response.ok) return { status: 'degraded', reason: `HTTP ${response.status}` };
    // Never console.log the parsed body here — it may contain non-public fields (spec §12).
    const json: unknown = await response.json();
    const result = this.validateFn(json);
    if (!result.valid) return { status: 'error', error: result.errors.join('; ') };
    return { status: 'ok', data: result.data };
  }
}
