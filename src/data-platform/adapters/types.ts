export interface DataLoadContext {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type DataLoadResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'degraded'; reason: string }
  | { status: 'error'; error: string };

export type ValidationResult<T> = { valid: true; data: T } | { valid: false; errors: string[] };

/**
 * A source-agnostic loader: the catalog/UI never talks to `fetch`, static imports, or a future
 * auth'd API directly — it goes through one of these. See BundledStaticAdapter/PublicHttpAdapter/
 * ProtectedApiAdapter for the concrete implementations, and docs/data-platform-architecture.md.
 */
export interface DatasetAdapter<T> {
  readonly datasetId: string;
  load(context?: DataLoadContext): Promise<DataLoadResult<T>>;
  validate(data: unknown): ValidationResult<T>;
}
