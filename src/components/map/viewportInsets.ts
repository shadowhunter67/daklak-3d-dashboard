export interface ViewportInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SafeViewportRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export function getSafeViewportRect(
  width: number,
  height: number,
  insets: ViewportInsets,
): SafeViewportRect {
  const left = Math.min(width, Math.max(0, insets.left));
  const top = Math.min(height, Math.max(0, insets.top));
  const right = Math.max(left, width - Math.max(0, insets.right));
  const bottom = Math.max(top, height - Math.max(0, insets.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function calculateRelativeZoom(previous: SafeViewportRect, next: SafeViewportRect): number {
  if (!previous.width || !previous.height) return 1;
  return Math.min(next.width / previous.width, next.height / previous.height);
}

export function getCorrectionToSafeRect(
  point: Point2D,
  safeRect: SafeViewportRect,
  margin = 24,
): Point2D {
  const horizontalMargin = Math.min(margin, safeRect.width / 2);
  const verticalMargin = Math.min(margin, safeRect.height / 2);
  const left = safeRect.left + horizontalMargin;
  const right = safeRect.right - horizontalMargin;
  const top = safeRect.top + verticalMargin;
  const bottom = safeRect.bottom - verticalMargin;
  return {
    x: point.x < left ? left - point.x : point.x > right ? right - point.x : 0,
    y: point.y < top ? top - point.y : point.y > bottom ? bottom - point.y : 0,
  };
}

export function calculateInsetDelta(previous: SafeViewportRect, next: SafeViewportRect): Point2D {
  return {
    x: (next.left + next.right - previous.left - previous.right) / 2,
    y: (next.top + next.bottom - previous.top - previous.bottom) / 2,
  };
}

export function areInsetsEqual(a: ViewportInsets, b: ViewportInsets, tolerance = 1): boolean {
  return (['top', 'right', 'bottom', 'left'] as const).every(
    (side) => Math.abs(a[side] - b[side]) < tolerance,
  );
}

export function clampZoom(zoom: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, zoom));
}

export function intersectionDepth(
  stageRect: DOMRect,
  overlayRect: DOMRect,
  side: keyof ViewportInsets,
): number {
  const overlapsX = overlayRect.right > stageRect.left && overlayRect.left < stageRect.right;
  const overlapsY = overlayRect.bottom > stageRect.top && overlayRect.top < stageRect.bottom;
  if ((side === 'top' || side === 'bottom') && !overlapsX) return 0;
  if ((side === 'left' || side === 'right') && !overlapsY) return 0;
  if (side === 'top' && overlayRect.top <= stageRect.top)
    return Math.max(0, Math.min(stageRect.bottom, overlayRect.bottom) - stageRect.top);
  if (side === 'bottom' && overlayRect.bottom >= stageRect.bottom)
    return Math.max(0, stageRect.bottom - Math.max(stageRect.top, overlayRect.top));
  if (side === 'left' && overlayRect.left <= stageRect.left)
    return Math.max(0, Math.min(stageRect.right, overlayRect.right) - stageRect.left);
  if (side === 'right' && overlayRect.right >= stageRect.right)
    return Math.max(0, stageRect.right - Math.max(stageRect.left, overlayRect.left));
  return 0;
}

export function measureViewportInsets(stage: HTMLElement): ViewportInsets {
  const stageRect = stage.getBoundingClientRect();
  const overlays = document.querySelectorAll<HTMLElement>('[data-viewport-overlay]');
  const insets: ViewportInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  overlays.forEach((overlay) => {
    const rect = overlay.getBoundingClientRect();
    const declaredSide = overlay.dataset.viewportOverlay;
    const sides =
      declaredSide && declaredSide in insets
        ? [declaredSide as keyof ViewportInsets]
        : (Object.keys(insets) as Array<keyof ViewportInsets>);
    sides.forEach((side) => {
      insets[side] = Math.max(insets[side], intersectionDepth(stageRect, rect, side));
    });
  });
  return insets;
}
