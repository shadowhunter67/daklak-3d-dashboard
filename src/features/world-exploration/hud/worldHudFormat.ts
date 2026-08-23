/**
 * Pure HUD display-formatting helpers, kept separate from the HUD components themselves so the
 * yaw -> compass-degrees derivation (the one part of this file with a real chance of a sign-flip
 * bug) is unit-testable without mounting React/Three.js.
 *
 * Derivation: `worldCoordinates.ts` establishes `worldZ = mercatorY`, and `playerMovement.ts`'s
 * `yaw = 0` faces local `(x=0, z=-1)` (world -Z). Mercator Y decreases as latitude increases, so
 * world -Z is geographic north — i.e. `yaw = 0` already faces north. Rotating the forward vector
 * by `yaw` via `yawToWorld` (`playerMovement.ts`) sends `yaw = +90°` to world `+X`, and
 * `worldX = mercatorX` increases eastward — so `yaw = +90°` faces east. North=0, east=90 is
 * exactly standard clockwise compass heading, so heading-in-degrees equals yaw-in-degrees
 * directly (normalized to [0, 360)) with no sign flip.
 */
export function yawToCompassDegrees(yawRadians: number): number {
  const degrees = (yawRadians * 180) / Math.PI;
  return ((degrees % 360) + 360) % 360;
}

/** `N`/`E`/`S`/`W`-style 4-point label is intentionally not localized beyond the single "N" glyph
 * already given its own translation key (`worldExploration.hud.compassNorth`) — E/S/W are the
 * same letter in both Vietnamese cardinal abbreviations ("Đ" for Đông is the one exception,
 * already avoided by only labeling North on the compass face, matching the plain rotating-needle
 * style `WorldCompass.tsx` renders). */
export function formatAltitudeMeters(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return '—';
  return Math.round(meters).toString();
}

/** `meters` should come from `worldCoordinates.ts`'s `haversineDistanceMeters` (real geographic
 * distance between the player's and the POI's lon/lat), not the Mercator-projected `worldDistance`
 * — see that function's doc comment for why. Rounded to the nearest meter; sub-meter precision
 * isn't meaningful at this scale. */
export function formatDistanceMeters(meters: number): string {
  return Math.round(meters).toString();
}

export function formatLatLon(longitude: number, latitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lon}`;
}
