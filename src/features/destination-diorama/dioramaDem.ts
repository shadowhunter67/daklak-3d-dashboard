import { DEM_CROPS, DEM_CROP_SIZE, DEM_METERS_PER_CELL } from './demCrops';
import { fbm3 } from './dioramaGeometry';
import type { HeightFn } from './dioramaTerrain';

/**
 * Địa hình diorama lấy từ DEM thật (SRTM ~2000, ~200 m/điểm ảnh, xem scripts/generate_diorama_dem.py).
 * Ngang: 1 đơn vị cảnh = `METERS_PER_UNIT` m, nên mảnh 8 km phủ vừa nền cảnh. Dọc: 1 đơn vị = `METERS_PER_HEIGHT_UNIT` m
 * (phóng đại dọc ×2 so với ngang để thấy được đồi núi). DEM thô và đã làm mượt nên đỉnh nhọn bị hạ thấp so với thật.
 */
export const METERS_PER_UNIT = 125;
export const METERS_PER_HEIGHT_UNIT = 62.5;
export const VERTICAL_EXAGGERATION = METERS_PER_UNIT / METERS_PER_HEIGHT_UNIT;

const cache = new Map<string, Uint16Array>();

function grid(site: string): Uint16Array {
  let data = cache.get(site);
  if (!data) {
    const encoded = DEM_CROPS[site];
    if (!encoded) throw new Error(`Không có DEM cho ${site}`);
    const binary = atob(encoded);
    // Little-endian tường minh (không phụ thuộc endianness của máy).
    data = new Uint16Array(binary.length / 2);
    for (let i = 0; i < data.length; i++) {
      data[i] = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
    }
    cache.set(site, data);
  }
  return data;
}

/** Độ cao thật (mét) tại (x, z) cảnh, nội suy song tuyến; tâm mảnh DEM ứng với (0, centerZ). */
export function demMeters(site: string, x: number, z: number, centerZ = -3): number {
  const data = grid(site);
  const cell = DEM_METERS_PER_CELL / METERS_PER_UNIT;
  const last = DEM_CROP_SIZE - 1;
  const gx = Math.min(last, Math.max(0, x / cell + DEM_CROP_SIZE / 2 - 0.5));
  const gy = Math.min(last, Math.max(0, (z - centerZ) / cell + DEM_CROP_SIZE / 2 - 0.5));
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(last, x0 + 1);
  const y1 = Math.min(last, y0 + 1);
  const tx = gx - x0;
  const ty = gy - y0;
  const at = (ix: number, iy: number) => data[iy * DEM_CROP_SIZE + ix];
  return (
    (at(x0, y0) * (1 - tx) + at(x1, y0) * tx) * (1 - ty) +
    (at(x0, y1) * (1 - tx) + at(x1, y1) * tx) * ty
  );
}

/** `HeightFn` từ DEM của một địa danh, thêm nhiễu nhỏ (< 0,2 đơn vị) cho đỡ mặt phẳng nhân tạo. */
export function makeDemHeight(site: string, centerZ = -3): HeightFn {
  return (x, z) =>
    demMeters(site, x, z, centerZ) / METERS_PER_HEIGHT_UNIT +
    (fbm3(x * 0.7, 0, z * 0.7, 3, 8) - 0.5) * 0.2;
}

/** Vị trí (x, z) cảnh của ô cao nhất trong mảnh DEM (đỉnh núi theo DEM). */
export function demPeak(site: string, centerZ = -3): { x: number; z: number; meters: number } {
  const data = grid(site);
  const cell = DEM_METERS_PER_CELL / METERS_PER_UNIT;
  let best = 0;
  let bx = 0;
  let by = 0;
  for (let y = 0; y < DEM_CROP_SIZE; y++) {
    for (let x = 0; x < DEM_CROP_SIZE; x++) {
      const v = data[y * DEM_CROP_SIZE + x];
      if (v > best) {
        best = v;
        bx = x;
        by = y;
      }
    }
  }
  return {
    x: (bx + 0.5 - DEM_CROP_SIZE / 2) * cell,
    z: (by + 0.5 - DEM_CROP_SIZE / 2) * cell + centerZ,
    meters: best,
  };
}
