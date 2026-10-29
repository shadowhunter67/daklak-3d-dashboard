import { resolveLabelCollisions } from '../detail-map/wardLabelPlacement';

/**
 * Screen-space label layout for the 3D map. Terrain labels used to be painted into a texture on
 * the (foreshortened, overlapping) terrain; this module instead takes each ward name's projected
 * SCREEN anchor and decides where its text box is drawn, so all 102 names stay horizontal, large
 * enough to read, and never silently hidden. Collisions are resolved by displacing a label to the
 * nearest free spot; a displaced label gets a leader line back to its anchor.
 *
 * Pure (no three.js / DOM): the caller projects 3D anchors to pixels and writes the result back.
 */
export interface ScreenLabelAnchor {
  code: string;
  name: string;
  /** Projected anchor in CSS pixels. */
  x: number;
  y: number;
  /** 1 = urban centre … larger = lower priority; only decides who keeps its spot first. */
  priority: number;
  /** The selected ward is placed first so it always keeps its anchor. */
  emphasized: boolean;
}

export interface ScreenLabelPlacement {
  code: string;
  name: string;
  anchorX: number;
  anchorY: number;
  /** Centre of the drawn text box. */
  x: number;
  y: number;
  width: number;
  height: number;
  displaced: boolean;
}

export interface ScreenLabelOptions {
  /** Base font size in px (already multiplied by the user's text scale). */
  fontSize: number;
  /** Space kept free of the viewport edge for on-screen labels. */
  edgePadding?: number;
}

const CHAR_WIDTH_EM = 0.6;
const BOX_PADDING_X = 10;
const BOX_PADDING_Y = 6;
const RADII_PX = [20, 36, 54, 74, 96, 120, 150, 185];

/** Size of a label's box including its pill padding, for an overestimate that errs towards space. */
export function screenLabelBox(
  name: string,
  fontSize: number,
  emphasized = false,
): { width: number; height: number } {
  const size = emphasized ? fontSize * 1.15 : fontSize;
  return {
    width: name.length * CHAR_WIDTH_EM * size + BOX_PADDING_X,
    height: size * 1.25 + BOX_PADDING_Y,
  };
}

export function layoutScreenLabels(
  anchors: readonly ScreenLabelAnchor[],
  viewport: { width: number; height: number },
  options: ScreenLabelOptions,
): ScreenLabelPlacement[] {
  const edge = options.edgePadding ?? 4;
  const boxes = anchors.map((anchor) =>
    screenLabelBox(anchor.name, options.fontSize, anchor.emphasized),
  );
  const resolved = resolveLabelCollisions(
    anchors.map((anchor, index) => ({
      id: anchor.code,
      x: anchor.x,
      y: anchor.y,
      width: boxes[index].width,
      height: boxes[index].height,
      priority: anchor.emphasized ? 0 : anchor.priority,
    })),
    { radiiPx: RADII_PX },
  );
  return anchors.map((anchor, index) => {
    const { width, height } = boxes[index];
    let x = anchor.x + resolved[index].dx;
    let y = anchor.y + resolved[index].dy;
    const onScreen =
      anchor.x >= 0 && anchor.x <= viewport.width && anchor.y >= 0 && anchor.y <= viewport.height;
    if (onScreen) {
      // Keep the whole box inside the viewport so an edge ward is never half cut off.
      x = Math.min(
        Math.max(x, width / 2 + edge),
        Math.max(viewport.width - width / 2 - edge, width / 2),
      );
      y = Math.min(
        Math.max(y, height / 2 + edge),
        Math.max(viewport.height - height / 2 - edge, height / 2),
      );
    }
    return {
      code: anchor.code,
      name: anchor.name,
      anchorX: anchor.x,
      anchorY: anchor.y,
      x,
      y,
      width,
      height,
      displaced: Math.abs(x - anchor.x) > 0.5 || Math.abs(y - anchor.y) > 0.5,
    };
  });
}
