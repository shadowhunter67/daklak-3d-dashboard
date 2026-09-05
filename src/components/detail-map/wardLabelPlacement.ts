/**
 * 102-label accessibility layout engine for the detail map's ward-name layer.
 *
 * Hard product requirement: all 102 xã/phường names must always be visible on the map — never
 * hidden by zoom-level thinning or collision culling (see docs/detail-map-integration.md,
 * "Ward-name label placement"). MapLibre's own symbol collision detection does the opposite (it
 * drops/thins overlapping labels), so `wardLabelLayers.ts`'s layers set `text-allow-overlap` +
 * `text-ignore-placement` on every label as the correctness floor — labels are never deleted.
 *
 * This module is the layer on top of that floor: a small greedy label-displacement algorithm that
 * pushes colliding labels apart in screen space instead of leaving them stacked illegibly. It is
 * pure and MapLibre-free (only takes/returns plain numbers) so it can be unit-tested
 * deterministically without a WebGL context — `MapLibreProvider.ts` is the only caller, feeding it
 * `map.project()` output and reading `map.unproject()` back for leader-line endpoints.
 *
 * Algorithm: greedy, priority-ordered, candidate-position search.
 *  1. Sort labels by priority ascending (1 = ward/urban centre wins ties), then by anchor position
 *     for determinism.
 *  2. For each label in that order, try candidate offsets in a fixed order: the anchor itself
 *     (no displacement) first, then 8 compass directions (N, NE, E, SE, S, SW, W, NW) at 3
 *     increasing radii — 25 candidates total.
 *  3. Pick the first candidate whose bounding box doesn't overlap any box already placed. If every
 *     candidate collides, pick the one with the smallest total overlap area (ties broken by
 *     candidate order) — a label is always placed somewhere, never dropped.
 *  4. A label placed anywhere other than its anchor gets `displaced: true`, which the caller uses
 *     to decide whether to draw a leader line back to the true geographic point.
 */

export interface LabelPlacementInput {
  id: string;
  /** Anchor position in screen pixels (from `map.project()`). */
  x: number;
  y: number;
  /** Estimated label bounding box in screen pixels, centered on the anchor before displacement. */
  width: number;
  height: number;
  /** Lower number = higher priority = tried/kept at the anchor first. */
  priority: number;
}

export interface LabelPlacementResult {
  id: string;
  /** Pixel offset applied to the anchor. (0, 0) means the label kept its geographic position. */
  dx: number;
  dy: number;
  /** True when `dx`/`dy` is non-zero — the caller should draw a leader line back to the anchor. */
  displaced: boolean;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const COMPASS_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, -1], // N
  [0.7071, -0.7071], // NE
  [1, 0], // E
  [0.7071, 0.7071], // SE
  [0, 1], // S
  [-0.7071, 0.7071], // SW
  [-1, 0], // W
  [-0.7071, -0.7071], // NW
];

const RADII_PX = [16, 28, 42];

/** Leader-line threshold: a displacement at or beyond the first radius step is far enough from the
 * true point that a reader benefits from a visual line back to it. */
export const LEADER_LINE_MIN_DISPLACEMENT_PX = RADII_PX[0];

function boxAt(centerX: number, centerY: number, width: number, height: number): Box {
  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
  };
}

function overlapArea(a: Box, b: Box): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

function candidateOffsets(): ReadonlyArray<readonly [number, number]> {
  const offsets: Array<readonly [number, number]> = [[0, 0]];
  for (const radius of RADII_PX) {
    for (const [dirX, dirY] of COMPASS_DIRECTIONS) {
      offsets.push([dirX * radius, dirY * radius]);
    }
  }
  return offsets;
}

const CANDIDATE_OFFSETS = candidateOffsets();

/** Deterministic: sorts a copy, never mutates `labels`. Always returns exactly one result per
 * input label (by `id`) — a label is displaced, never dropped. */
export function resolveLabelCollisions(
  labels: readonly LabelPlacementInput[],
): LabelPlacementResult[] {
  const ordered = [...labels].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.id.localeCompare(b.id);
  });

  const placedBoxes: Box[] = [];
  const results = new Map<string, LabelPlacementResult>();

  for (const label of ordered) {
    let chosen: readonly [number, number] = CANDIDATE_OFFSETS[0];
    let chosenBox = boxAt(label.x, label.y, label.width, label.height);
    let bestOverlap = Infinity;

    for (const [offsetX, offsetY] of CANDIDATE_OFFSETS) {
      const box = boxAt(label.x + offsetX, label.y + offsetY, label.width, label.height);
      let totalOverlap = 0;
      for (const placed of placedBoxes) {
        totalOverlap += overlapArea(box, placed);
        if (totalOverlap >= bestOverlap) break; // can't beat the current best; stop early
      }
      if (totalOverlap < bestOverlap) {
        bestOverlap = totalOverlap;
        chosen = [offsetX, offsetY];
        chosenBox = box;
        if (totalOverlap === 0) break; // perfect candidate, no need to keep searching
      }
    }

    placedBoxes.push(chosenBox);
    results.set(label.id, {
      id: label.id,
      dx: chosen[0],
      dy: chosen[1],
      displaced: chosen[0] !== 0 || chosen[1] !== 0,
    });
  }

  // Return in the caller's original order, not the internal priority-sorted order.
  return labels.map((label) => {
    const result = results.get(label.id);
    if (!result) throw new Error(`resolveLabelCollisions: missing result for "${label.id}"`);
    return result;
  });
}

/** Rough single-line text width in CSS pixels for "Noto Sans Regular" at `fontSizePx`, tuned for
 * Vietnamese diacritics (which run slightly wider than plain Latin at the same point size). Not
 * exact glyph metrics (no canvas/DOM access here — this module stays MapLibre/DOM-free) — a
 * deliberate over-estimate is safer than an under-estimate: it makes the placement engine slightly
 * more conservative about collisions rather than risk true overlap it can't see. */
const AVG_CHAR_WIDTH_EM = 0.62;

/** Mirrors `text-max-width: 8` (ems) from `wardLabelLayers.ts` — kept as a named constant here so
 * the two files can't silently drift apart; if that layout property ever changes, update both. */
export const WARD_LABEL_MAX_WIDTH_EM = 8;

export interface EstimatedLabelBox {
  width: number;
  height: number;
  lineCount: number;
}

/** Estimates the on-screen box a MapLibre symbol layer will render for `name` at `fontSizePx`,
 * wrapping at `WARD_LABEL_MAX_WIDTH_EM` the same way `text-max-width` does (whole words only). Used
 * to feed `resolveLabelCollisions` real-enough box sizes instead of a fixed placeholder — a long
 * ward name (e.g. "Buôn Ma Thuột") needs a visibly bigger exclusion box than "Ea Na". */
export function estimateLabelBoxPx(name: string, fontSizePx: number): EstimatedLabelBox {
  const maxWidthPx = WARD_LABEL_MAX_WIDTH_EM * fontSizePx;
  const words = name.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const candidateWidthPx = candidate.length * AVG_CHAR_WIDTH_EM * fontSizePx;
    if (candidateWidthPx <= maxWidthPx || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const widestLineChars = Math.max(...lines.map((line) => line.length), 1);
  return {
    width: Math.min(widestLineChars * AVG_CHAR_WIDTH_EM * fontSizePx, maxWidthPx),
    height: lines.length * fontSizePx * 1.3,
    lineCount: lines.length,
  };
}
