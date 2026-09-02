/**
 * Pure animation math for the MapLibre ward-selection highlight — no MapLibre import, so it's
 * unit-testable in isolation from `MapLibreProvider.ts`, which owns the `requestAnimationFrame`
 * loop and the actual `map.setPaintProperty` calls (see that file's `setSelectedWard`).
 *
 * Deliberately NOT a literal "draw the boundary" stroke animation like the 2D SVG surface's
 * `pathLength`/`stroke-dashoffset` trick (`AdministrativeMap2D.tsx`) — MapLibre's `line-dasharray`
 * is specified in line-width units (not normalized 0..1 like SVG's `pathLength`), and the renderer
 * regenerates its dash texture on every `setPaintProperty` call, so animating it per frame would be
 * both visually janky and geometrically inconsistent across ~100 differently-sized ward polygons.
 * Instead this produces a "glow ring collapsing onto the boundary" — line width shrinks from a wide
 * soft ring down to a thin sharp outline while fill/line opacity bloom in — the MapLibre analogue of
 * the SVG surface's glow-in, without the draw-in.
 */

export interface WardHighlightFrame {
  fillOpacity: number;
  lineOpacity: number;
  lineWidth: number;
  lineBlur: number;
}

export const WARD_HIGHLIGHT_DURATION_MS = 900;
export const WARD_FLY_DURATION_MS = 900;

const SETTLED_FILL_OPACITY = 0.45;
const BLOOM_FILL_OPACITY = 0.22;
const RING_START_WIDTH = 8;
const RING_END_WIDTH = 2.4;
const RING_START_BLUR = 6;

export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - clamped) ** 3;
}

/** Frame at `progress` (typically elapsed/duration, clamped internally to [0,1]). */
export function wardHighlightFrameAt(progress: number): WardHighlightFrame {
  const p = Math.min(Math.max(progress, 0), 1);
  const e = easeOutCubic(p);
  const bloom = Math.sin(Math.PI * p);

  return {
    fillOpacity: SETTLED_FILL_OPACITY * e + BLOOM_FILL_OPACITY * bloom,
    lineOpacity: e,
    lineWidth: RING_END_WIDTH + (RING_START_WIDTH - RING_END_WIDTH) * (1 - e),
    lineBlur: RING_START_BLUR * (1 - e),
  };
}

export const WARD_HIGHLIGHT_SETTLED: WardHighlightFrame = wardHighlightFrameAt(1);
export const WARD_HIGHLIGHT_HIDDEN: WardHighlightFrame = {
  fillOpacity: 0,
  lineOpacity: 0,
  lineWidth: RING_END_WIDTH,
  lineBlur: 0,
};
