import type { DataLoadResult, DatasetAdapter, ValidationResult } from './types';

/**
 * For `classification: 'public'` data already committed and statically imported into the bundle —
 * this is what every dataset in the catalog actually uses today (see catalog/datasets.ts). `load`
 * is synchronous work wrapped in a resolved Promise only to satisfy the shared `DatasetAdapter`
 * contract; there is no I/O.
 */
export class BundledStaticAdapter<T> implements DatasetAdapter<T> {
  constructor(
    readonly datasetId: string,
    private readonly data: unknown,
    private readonly validateFn: (data: unknown) => ValidationResult<T>,
  ) {}

  validate(data: unknown): ValidationResult<T> {
    return this.validateFn(data);
  }

  async load(): Promise<DataLoadResult<T>> {
    const result = this.validateFn(this.data);
    if (!result.valid) return { status: 'error', error: result.errors.join('; ') };
    return { status: 'ok', data: result.data };
  }
}
