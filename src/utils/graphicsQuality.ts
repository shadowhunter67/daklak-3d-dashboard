export type GraphicsQualityTier = 'low' | 'medium' | 'high';

export interface GraphicsQualitySignals {
  devicePixelRatio: number;
  hardwareConcurrency: number | undefined;
}

export interface GraphicsQualityConfig {
  tier: GraphicsQualityTier;
  /** Upper bound for the Canvas `dpr` range; the lower bound stays 1 in every tier. */
  maxDevicePixelRatio: number;
  antialias: boolean;
  contactShadows: boolean;
}

/**
 * Pure decision function: no DOM access, no benchmarking, no telemetry. Only cheap, already
 * -available signals (device pixel ratio, logical core count). The default must stay
 * conservative — a typical current desktop/laptop (>=4 cores, DPR<3) resolves to 'high', which
 * matches today's hardcoded Canvas config exactly, so nothing changes for the common case.
 * Only clearly constrained devices are downgraded.
 *
 * `reducedMotion` is deliberately not a tier signal here even though the task allows it: this
 * app's Playwright suite emulates reduced motion on desktop and mobile purely to freeze
 * animation for stable screenshots, not as a real low-power-hardware signal, and auto-rotate is
 * already independently disabled by `reducedMotion` in the map store. Feeding the same signal
 * into rendering quality would silently invalidate the committed visual baselines.
 */
export function decideGraphicsQualityTier(signals: GraphicsQualitySignals): GraphicsQualityTier {
  if (signals.devicePixelRatio >= 3) return 'low';
  const cores = signals.hardwareConcurrency ?? 4;
  if (cores <= 2) return 'low';
  if (cores <= 4) return 'medium';
  return 'high';
}

export function getGraphicsQualityConfig(tier: GraphicsQualityTier): GraphicsQualityConfig {
  if (tier === 'low') {
    return { tier, maxDevicePixelRatio: 1, antialias: false, contactShadows: false };
  }
  // medium and high both match the pre-existing hardcoded Canvas configuration; medium is
  // intentionally identical to high today (see task: "gần với cấu hình hiện tại") and is the
  // seam to lower first if a future budget/profiling reason requires a real distinction.
  return { tier, maxDevicePixelRatio: 1.35, antialias: true, contactShadows: true };
}

export function readGraphicsQualitySignals(): GraphicsQualitySignals {
  if (typeof window === 'undefined') {
    return { devicePixelRatio: 1, hardwareConcurrency: undefined };
  }
  return {
    devicePixelRatio: window.devicePixelRatio || 1,
    hardwareConcurrency: window.navigator.hardwareConcurrency,
  };
}

export function getGraphicsQualityConfigForCurrentDevice(): GraphicsQualityConfig {
  return getGraphicsQualityConfig(decideGraphicsQualityTier(readGraphicsQualitySignals()));
}
