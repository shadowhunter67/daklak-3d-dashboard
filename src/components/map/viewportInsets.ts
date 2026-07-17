export interface ViewportInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CameraFrame {
  zoomScale: number;
  offsetX: number;
  offsetY: number;
}

export function calculateCameraFrame(
  width: number,
  height: number,
  insets: ViewportInsets,
): CameraFrame {
  const usableWidth = Math.max(1, width - insets.left - insets.right);
  const usableHeight = Math.max(1, height - insets.top - insets.bottom);
  return {
    zoomScale: Math.min(usableWidth / width, usableHeight / height),
    offsetX: (insets.left - insets.right) / 2,
    offsetY: (insets.top - insets.bottom) / 2,
  };
}

export function measureViewportInsets(stage: HTMLElement): ViewportInsets {
  const stageRect = stage.getBoundingClientRect();
  const sheet = document.getElementById('mobile-dashboard-sheet');
  const sheetRect = sheet?.getBoundingClientRect();
  const bottom = sheetRect
    ? Math.max(
        0,
        Math.min(stageRect.bottom, sheetRect.bottom) - Math.max(stageRect.top, sheetRect.top),
      )
    : 0;
  return { top: 0, right: 0, bottom, left: 0 };
}
