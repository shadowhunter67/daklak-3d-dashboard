import { resolveLabelCollisions } from '../../components/detail-map/wardLabelPlacement';

/**
 * Screen-space label layout for the Overview locator map. All 102 ward/commune names are always
 * drawn: colliding names are displaced (and get a leader line back to their anchor), never hidden.
 * The SVG has a fixed viewBox, so the layout is computed once, deterministically, from the same
 * pure engine the detail map uses (`resolveLabelCollisions`).
 */
export interface OverviewLabelInput {
  code: string;
  name: string;
  x: number;
  y: number;
  priority: number;
}

export interface OverviewLabelPlacement {
  code: string;
  name: string;
  /** Anchor (true geographic position, viewBox units). */
  anchorX: number;
  anchorY: number;
  /** Where the text is drawn (centred), viewBox units. */
  x: number;
  y: number;
  displaced: boolean;
}

export const OVERVIEW_LABEL_FONT_SIZE = 11;
const CHAR_WIDTH_EM = 0.64;
const LINE_HEIGHT_EM = 1.45;
const RADII_PX = [14, 26, 40, 56, 74, 94];

export function layoutOverviewLabels(
  labels: readonly OverviewLabelInput[],
  fontSize = OVERVIEW_LABEL_FONT_SIZE,
): OverviewLabelPlacement[] {
  const results = resolveLabelCollisions(
    labels.map((label) => ({
      id: label.code,
      x: label.x,
      y: label.y,
      width: label.name.length * CHAR_WIDTH_EM * fontSize,
      height: fontSize * LINE_HEIGHT_EM,
      priority: label.priority,
    })),
    { radiiPx: RADII_PX },
  );
  return labels.map((label, index) => ({
    code: label.code,
    name: label.name,
    anchorX: label.x,
    anchorY: label.y,
    x: label.x + results[index].dx,
    y: label.y + results[index].dy,
    displaced: results[index].displaced,
  }));
}
