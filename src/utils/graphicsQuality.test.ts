import { describe, expect, it } from 'vitest';
import { decideGraphicsQualityTier, getGraphicsQualityConfig } from './graphicsQuality';

describe('decideGraphicsQualityTier', () => {
  it('resolves a typical modern desktop to high', () => {
    expect(decideGraphicsQualityTier({ devicePixelRatio: 1, hardwareConcurrency: 8 })).toBe('high');
  });

  it('resolves a mid-range device (4 cores) to medium', () => {
    expect(decideGraphicsQualityTier({ devicePixelRatio: 2, hardwareConcurrency: 4 })).toBe(
      'medium',
    );
  });

  it('resolves a low-core device to low', () => {
    expect(decideGraphicsQualityTier({ devicePixelRatio: 1, hardwareConcurrency: 2 })).toBe('low');
  });

  it('resolves a very high pixel density display to low regardless of core count', () => {
    expect(decideGraphicsQualityTier({ devicePixelRatio: 3, hardwareConcurrency: 8 })).toBe('low');
  });

  it('treats an unknown hardwareConcurrency as a conservative mid-range default', () => {
    expect(decideGraphicsQualityTier({ devicePixelRatio: 1, hardwareConcurrency: undefined })).toBe(
      'medium',
    );
  });

  it('does not downgrade quality for the Pixel 7 Playwright device profile (DPR 2.625)', () => {
    // Regression guard: this project's mobile visual baselines are captured under
    // devices['Pixel 7'] (deviceScaleFactor 2.625) and must keep matching the 'high'/'medium'
    // config, not silently drop to 'low'.
    expect(decideGraphicsQualityTier({ devicePixelRatio: 2.625, hardwareConcurrency: 8 })).toBe(
      'high',
    );
  });
});

describe('getGraphicsQualityConfig', () => {
  it('disables antialias and ContactShadows and caps DPR at 1 for low', () => {
    const config = getGraphicsQualityConfig('low');
    expect(config).toEqual({
      tier: 'low',
      maxDevicePixelRatio: 1,
      antialias: false,
      contactShadows: false,
    });
  });

  it('matches the pre-existing hardcoded Canvas configuration for medium and high', () => {
    expect(getGraphicsQualityConfig('medium')).toEqual({
      tier: 'medium',
      maxDevicePixelRatio: 1.35,
      antialias: true,
      contactShadows: true,
    });
    expect(getGraphicsQualityConfig('high')).toEqual({
      tier: 'high',
      maxDevicePixelRatio: 1.35,
      antialias: true,
      contactShadows: true,
    });
  });
});
