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
const CHAR_WIDTH_EM = 0.6;
const LINE_HEIGHT_EM = 1.3;
const LAYOUT_PADDING_PX = 3;
const RADII_PX = [14, 26, 40, 56, 74, 94];

/**
 * Chiều dài chữ mà bộ bố trí giả định cho một nhãn. Giao diện ép chữ vẽ ra đúng chiều dài này
 * (`textLength`) để hộp nhãn trong trình duyệt khớp bộ bố trí trên mọi nền tảng/phông chữ; nếu không,
 * phông rộng hơn (ví dụ trên Linux) làm nhãn chồng nhau dù bộ bố trí đã tách.
 */
export function overviewLabelTextLength(name: string, fontSize = OVERVIEW_LABEL_FONT_SIZE): number {
  return name.length * CHAR_WIDTH_EM * fontSize;
}

export function layoutOverviewLabels(
  labels: readonly OverviewLabelInput[],
  fontSize = OVERVIEW_LABEL_FONT_SIZE,
): OverviewLabelPlacement[] {
  const results = resolveLabelCollisions(
    labels.map((label) => ({
      id: label.code,
      x: label.x,
      y: label.y,
      // Nhãn được vẽ đúng `textLength`; cộng đệm nhỏ để hai nhãn sát nhau không chạm do làm tròn.
      width: overviewLabelTextLength(label.name, fontSize) + LAYOUT_PADDING_PX,
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
