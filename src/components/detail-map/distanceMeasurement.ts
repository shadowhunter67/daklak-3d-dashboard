export interface MeasurementPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two points, in meters (haversine formula). */
export function haversineDistanceMeters(a: MeasurementPoint, b: MeasurementPoint): number {
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinHalfLat = Math.sin(deltaLat / 2);
  const sinHalfLng = Math.sin(deltaLng / 2);
  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function totalMeasurementDistanceMeters(points: readonly MeasurementPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineDistanceMeters(points[index - 1], points[index]);
  }
  return total;
}

export function addMeasurementPoint(
  points: readonly MeasurementPoint[],
  point: MeasurementPoint,
): MeasurementPoint[] {
  return [...points, point];
}

export function undoLastMeasurementPoint(points: readonly MeasurementPoint[]): MeasurementPoint[] {
  return points.slice(0, -1);
}

export function formatMeasurementDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km`;
}
