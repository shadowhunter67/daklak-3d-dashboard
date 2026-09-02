/**
 * Pure math for "fly the 2D administrative SVG map into a selected ward" — a mapeffect.app-style
 * zoom-and-frame effect. Kept dependency-free from `AdministrativeMap2D.tsx` (no DOM, no d3
 * instance) so the framing/interpolation math is unit-testable in isolation; the component owns
 * the `requestAnimationFrame` loop and DOM writes (see that file's doc comment for why the tween
 * is driven imperatively via a ref rather than React state — ~100 ward paths, no per-frame re-render).
 */

export interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Matches `AdministrativeMap2D.tsx`'s SVG viewBox — the fixed frame the whole map has always used. */
export const MAP_VIEW_WIDTH = 900;
export const MAP_VIEW_HEIGHT = 720;
export const FULL_VIEW: ViewBoxRect = {
  x: 0,
  y: 0,
  width: MAP_VIEW_WIDTH,
  height: MAP_VIEW_HEIGHT,
};

export const FOCUS_IN_DURATION_MS = 700;
export const FOCUS_OUT_DURATION_MS = 450;

const FRAME_PADDING = 1.7;
const MAX_ZOOM = 4;

export function easeInOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return clamped < 0.5 ? 4 * clamped ** 3 : 1 - (-2 * clamped + 2) ** 3 / 2;
}

/**
 * Computes the viewBox that frames a ward's projected pixel bounds (`d3.geoPath.bounds(feature)`)
 * inside the map's fixed 900x720 frame, preserving aspect ratio and never panning past the map's
 * own extent — a ward near the province edge stays fully inside the SVG viewport instead of
 * clipping off-screen.
 */
export function focusViewBox(bounds: [[number, number], [number, number]]): ViewBoxRect {
  const [[x0, y0], [x1, y1]] = bounds;
  const featureWidth = Math.max(x1 - x0, 1e-6);
  const featureHeight = Math.max(y1 - y0, 1e-6);
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;

  const zoom = Math.min(
    Math.max(
      Math.min(
        MAP_VIEW_WIDTH / (featureWidth * FRAME_PADDING),
        MAP_VIEW_HEIGHT / (featureHeight * FRAME_PADDING),
      ),
      1,
    ),
    MAX_ZOOM,
  );

  const width = MAP_VIEW_WIDTH / zoom;
  const height = MAP_VIEW_HEIGHT / zoom;
  const x = Math.min(Math.max(centerX - width / 2, 0), MAP_VIEW_WIDTH - width);
  const y = Math.min(Math.max(centerY - height / 2, 0), MAP_VIEW_HEIGHT - height);

  return { x, y, width, height };
}

/**
 * Interpolates between two viewBox rects for the fly-to tween. Width is interpolated
 * geometrically (`from ** (1-e) * to ** e`, i.e. equal-ratio steps per unit of eased time) rather
 * than linearly, so the zoom reads as a constant-feeling rate of change instead of accelerating
 * hardest at the start (a linear-width tween moving from 900 to 225 covers 3x more width in its
 * first 25% of progress than its last 25%). Height follows the same scale to keep the frame's
 * aspect ratio fixed at 900:720 throughout. Center is linear; the result is clamped back inside
 * the map's own extent every frame so a mid-flight retarget never produces a rect outside it.
 */
export function interpolateViewBox(from: ViewBoxRect, to: ViewBoxRect, t: number): ViewBoxRect {
  const e = easeInOutCubic(t);
  const width = from.width ** (1 - e) * to.width ** e;
  const height = (width * MAP_VIEW_HEIGHT) / MAP_VIEW_WIDTH;

  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;
  const toCenterY = to.y + to.height / 2;
  const centerX = fromCenterX + (toCenterX - fromCenterX) * e;
  const centerY = fromCenterY + (toCenterY - fromCenterY) * e;

  const x = Math.min(Math.max(centerX - width / 2, 0), MAP_VIEW_WIDTH - width);
  const y = Math.min(Math.max(centerY - height / 2, 0), MAP_VIEW_HEIGHT - height);

  return { x, y, width, height };
}

export function viewBoxesApproximatelyEqual(
  a: ViewBoxRect,
  b: ViewBoxRect,
  epsilon = 1e-3,
): boolean {
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.width - b.width) < epsilon &&
    Math.abs(a.height - b.height) < epsilon
  );
}
