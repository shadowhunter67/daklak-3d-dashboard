import type { DataLoadContext, DataLoadResult, DatasetAdapter, ValidationResult } from './types';

export interface PublicHttpAdapterOptions<T> {
  datasetId: string;
  url: string;
  /** Default 8s — a public dataset fetch should never hang the UI indefinitely. */
  timeoutMs?: number;
  /** Default 2 — retries only apply to network failures/5xx, never 4xx (see load()). */
  maxRetries?: number;
  validate: (data: unknown) => ValidationResult<T>;
}

/**
 * For `access.delivery: 'public-api'` datasets with a stable, unauthenticated endpoint. Not wired
 * to any live dataset in this repo yet — no such endpoint has been verified — but is real,
 * general-purpose code, unit-tested against a mocked `fetch` (see PublicHttpAdapter.test.ts).
 */
export class PublicHttpAdapter<T> implements DatasetAdapter<T> {
  readonly datasetId: string;
  private readonly url: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly validateFn: (data: unknown) => ValidationResult<T>;

  constructor(options: PublicHttpAdapterOptions<T>) {
    this.datasetId = options.datasetId;
    this.url = options.url;
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.maxRetries = options.maxRetries ?? 2;
    this.validateFn = options.validate;
  }

  validate(data: unknown): ValidationResult<T> {
    return this.validateFn(data);
  }

  async load(context: DataLoadContext = {}): Promise<DataLoadResult<T>> {
    if (!this.url.startsWith('https://')) {
      return { status: 'error', error: 'Source URL must use HTTPS' };
    }
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), context.timeoutMs ?? this.timeoutMs);
    const onExternalAbort = () => controller.abort();
    context.signal?.addEventListener('abort', onExternalAbort);
    try {
      let lastFailureReason = 'unknown error';
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        try {
          const response = await fetch(this.url, { signal: controller.signal });
          if (response.status >= 400 && response.status < 500) {
            return { status: 'error', error: `HTTP ${response.status} (not retried)` };
          }
          if (!response.ok) {
            lastFailureReason = `HTTP ${response.status}`;
            continue;
          }
          const json: unknown = await response.json();
          const result = this.validateFn(json);
          if (!result.valid) return { status: 'error', error: result.errors.join('; ') };
          return { status: 'ok', data: result.data };
        } catch (error) {
          if (controller.signal.aborted)
            return { status: 'degraded', reason: 'timeout-or-aborted' };
          lastFailureReason = error instanceof Error ? error.message : 'unknown fetch error';
        }
      }
      return { status: 'degraded', reason: lastFailureReason };
    } finally {
      clearTimeout(timeoutHandle);
      context.signal?.removeEventListener('abort', onExternalAbort);
    }
  }
}
