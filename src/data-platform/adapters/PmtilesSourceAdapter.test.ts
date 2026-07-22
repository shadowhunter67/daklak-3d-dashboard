import { describe, expect, it } from 'vitest';
import { PmtilesSourceAdapter } from './PmtilesSourceAdapter';

describe('PmtilesSourceAdapter', () => {
  it('reports unavailable when no URL is configured', () => {
    const adapter = new PmtilesSourceAdapter({
      datasetId: 'road-network-detail-map-pmtiles',
      configuredUrl: undefined,
      attribution: '© OpenStreetMap contributors',
    });
    expect(adapter.describe()).toEqual({
      datasetId: 'road-network-detail-map-pmtiles',
      url: null,
      available: false,
      attribution: '© OpenStreetMap contributors',
      checksum: undefined,
      expiresAt: undefined,
    });
  });

  it('reports unavailable for an empty-string URL (Vite env default)', () => {
    const adapter = new PmtilesSourceAdapter({
      datasetId: 'ds',
      configuredUrl: '',
      attribution: 'attr',
    });
    expect(adapter.describe().available).toBe(false);
  });

  it('reports available with the configured URL and checksum', () => {
    const adapter = new PmtilesSourceAdapter({
      datasetId: 'ds',
      configuredUrl: '/maps/daklak.pmtiles',
      attribution: 'attr',
      checksum: 'abc123',
    });
    expect(adapter.describe()).toEqual({
      datasetId: 'ds',
      url: '/maps/daklak.pmtiles',
      available: true,
      attribution: 'attr',
      checksum: 'abc123',
      expiresAt: undefined,
    });
  });
});
