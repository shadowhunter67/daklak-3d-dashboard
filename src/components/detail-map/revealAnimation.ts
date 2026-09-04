/**
 * Generic "glow reveal" frame math — mapeffect.app capability 1 ("Khoanh vùng": a zone lights up
 * instead of just appearing). Same bloom-then-settle shape as `wardHighlightAnimation.ts`'s
 * `wardHighlightFrameAt`, but parameterized by target opacity/width instead of the ward highlight's
 * hardcoded values, so it can drive any fill+line pair — currently the "Ranh quy hoạch đã duyệt"
 * zones when that layer is switched on. `wardHighlightAnimation.ts` itself is left untouched
 * (well-tested, ward-specific tuning) rather than refactored onto this to avoid regressing it.
 */

export interface RevealTargets {
  fillOpacity: number;
  lineOpacity: number;
  lineWidth: number;
}

export interface RevealFrame {
  fillOpacity: number;
  lineOpacity: number;
  lineWidth: number;
  lineBlur: number;
}

export const REVEAL_DURATION_MS = 700;

const RING_START_WIDTH_MULTIPLIER = 3;
const RING_START_BLUR = 5;

export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - clamped) ** 3;
}

/** Frame at `progress` (elapsed/duration, clamped internally to [0,1]) for the given targets. */
export function revealFrameAt(progress: number, targets: RevealTargets): RevealFrame {
  const p = Math.min(Math.max(progress, 0), 1);
  const e = easeOutCubic(p);
  const bloom = Math.sin(Math.PI * p);

  return {
    fillOpacity: targets.fillOpacity * e + targets.fillOpacity * 0.6 * bloom,
    lineOpacity: targets.lineOpacity * e,
    lineWidth:
      targets.lineWidth +
      (targets.lineWidth * RING_START_WIDTH_MULTIPLIER - targets.lineWidth) * (1 - e),
    lineBlur: RING_START_BLUR * (1 - e),
  };
}

export function revealSettledFrame(targets: RevealTargets): RevealFrame {
  return revealFrameAt(1, targets);
}

export function revealHiddenFrame(targets: RevealTargets): RevealFrame {
  return { fillOpacity: 0, lineOpacity: 0, lineWidth: targets.lineWidth, lineBlur: 0 };
}
