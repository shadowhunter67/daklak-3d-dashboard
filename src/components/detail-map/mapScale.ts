/** Real scale-bar math for the detail map (MapLibre uses 512px tiles). */
const NICE_STEPS_M = [
  50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000,
];

export function metersPerPixel(latitude: number, zoom: number): number {
  return (78_271.516964 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
}

/** Largest "nice" distance whose bar fits within `maxPx` pixels at this camera. */
export function pickScaleBar(
  latitude: number,
  zoom: number,
  maxPx = 110,
): { meters: number; widthPx: number; label: string } {
  const perPx = metersPerPixel(latitude, zoom);
  const fitting = NICE_STEPS_M.filter((meters) => meters / perPx <= maxPx);
  const meters = fitting.length ? fitting[fitting.length - 1] : NICE_STEPS_M[0];
  return {
    meters,
    widthPx: Math.max(Math.round(meters / perPx), 12),
    label: meters >= 1000 ? `${meters / 1000} km` : `${meters} m`,
  };
}
