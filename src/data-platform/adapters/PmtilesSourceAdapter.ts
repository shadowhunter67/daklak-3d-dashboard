/**
 * Describes a PMTiles/vector-tile source for the provenance UI. This intentionally does NOT
 * implement `DatasetAdapter<T>` — a tile source isn't "load a value, validate it," it's "is a URL
 * configured, and what do we know about it" — and it deliberately does not touch
 * `DetailMapViewport.tsx`'s existing `readSourceAvailability()` or `MapLibreProvider`, to avoid
 * risking the already-working detail-map wiring for a display-only feature. See
 * docs/detail-map-integration.md for why no real PMTiles file exists yet.
 */
export interface PmtilesSourceDescriptor {
  datasetId: string;
  /** null when the corresponding env var is unset/empty. */
  url: string | null;
  available: boolean;
  attribution: string;
  checksum?: string;
  /** Set only for a future signed/short-lived URL; undefined for a permanent static source. */
  expiresAt?: string;
}

export interface PmtilesSourceAdapterOptions {
  datasetId: string;
  /** e.g. import.meta.env.VITE_DETAIL_MAP_SOURCE_URL — read by the caller, not this class, so it
   * stays trivially testable without stubbing `import.meta.env`. */
  configuredUrl: string | undefined;
  attribution: string;
  checksum?: string;
  expiresAt?: string;
}

export class PmtilesSourceAdapter {
  readonly datasetId: string;
  private readonly configuredUrl: string | undefined;
  private readonly attribution: string;
  private readonly checksum?: string;
  private readonly expiresAt?: string;

  constructor(options: PmtilesSourceAdapterOptions) {
    this.datasetId = options.datasetId;
    this.configuredUrl = options.configuredUrl;
    this.attribution = options.attribution;
    this.checksum = options.checksum;
    this.expiresAt = options.expiresAt;
  }

  describe(): PmtilesSourceDescriptor {
    const url = this.configuredUrl && this.configuredUrl.length > 0 ? this.configuredUrl : null;
    return {
      datasetId: this.datasetId,
      url,
      available: url !== null,
      attribution: this.attribution,
      checksum: this.checksum,
      expiresAt: this.expiresAt,
    };
  }
}
