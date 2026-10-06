import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Hình học thủ tục thuần (không React) cho diorama minh hoạ điểm đến. Tách khỏi component để test
 * được bằng Vitest mà không cần WebGL. Ý tưởng "đá chôn một phần, tô màu theo đỉnh" và rải tảng đá
 * ven đường được điều chỉnh từ `rock-cluster` của skill 3dviz-pro-max (MIT,
 * github.com/viettranx/3dviz-pro-max).
 */

/** PRNG xác định (mulberry32) — cùng seed luôn cho cùng cảnh, nên test và ảnh chụp ổn định. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h =
    Math.imul(ix, 374761393) ^
    Math.imul(iy, 668265263) ^
    Math.imul(iz, 2147483647) ^
    Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** smoothstep tổng quát; edge0 > edge1 cho ra đường giảm dần. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  return fade(clamp01((x - edge0) / (edge1 - edge0)));
}

/** Nhiễu giá trị 3D trơn trong [0, 1] — đủ cho địa hình/đá, không cần thư viện nhiễu. */
export function valueNoise3(x: number, y: number, z: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const fz = fade(z - iz);
  const c = (dx: number, dy: number, dz: number) => hash3(ix + dx, iy + dy, iz + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

/** Tổng nhiều tầng nhiễu (fBm), chuẩn hoá về [0, 1]. */
export function fbm3(x: number, y: number, z: number, octaves = 4, seed = 0): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * valueNoise3(x * frequency, y * frequency, z * frequency, seed + i * 17);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / norm;
}

/**
 * Tảng đá granit đơn vị: icosahedron chia nhỏ, hàn đỉnh để có pháp tuyến trơn, biến dạng bằng
 * nhiễu theo hướng (khối tròn + vài gờ), rồi tô màu theo đỉnh: vệt ẩm sẫm sát chân, rêu trên mặt
 * hướng lên, lốm đốm đá. Đáy nằm trên y = 0, vừa khít hộp 1×1×1 (scale ở instance quyết định cỡ).
 */
export function createBoulderGeometry(
  detail: number,
  amount: number,
  random: () => number,
  cuts = 0,
): THREE.BufferGeometry {
  const base = new THREE.IcosahedronGeometry(1, detail);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const geometry = mergeVertices(base);
  base.dispose();
  const seed = Math.floor(random() * 1000);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const direction = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize();
    const lump = fbm3(direction.x * 1.5 + seed, direction.y * 1.5, direction.z * 1.5, 3, seed);
    const ridgeNoise = fbm3(
      direction.x * 3.1,
      direction.y * 3.1 + seed,
      direction.z * 3.1,
      2,
      seed + 5,
    );
    const ridge = 1 - Math.abs(2 * ridgeNoise - 1);
    const radius = 1 + (lump - 0.5) * 2 * amount + ridge * amount * 0.35;
    position.setXYZ(i, direction.x * radius, direction.y * radius * 0.84, direction.z * radius);
  }
  // Mặt cắt phẳng: kẹp đỉnh vượt qua mỗi mặt phẳng ngẫu nhiên về đúng mặt đó → đá có mặt phẳng và
  // cạnh gờ như granit nứt vỡ, thay vì khối tròn trơn.
  for (let c = 0; c < cuts; c++) {
    const normal = new THREE.Vector3(random() - 0.5, random() * 0.9 - 0.25, random() - 0.5);
    normal.normalize();
    const offset = 0.68 + random() * 0.2;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      const excess = vertex.dot(normal) - offset;
      if (excess > 0) {
        vertex.addScaledVector(normal, -excess);
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
    }
  }
  geometry.rotateX((random() - 0.5) * 1.5);
  geometry.rotateZ((random() - 0.5) * 1.5);
  geometry.rotateY(random() * Math.PI * 2);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox as THREE.Box3;
  const size = box.getSize(new THREE.Vector3());
  geometry.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  geometry.computeVertexNormals();

  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const speckle = valueNoise3(x * 26, y * 26, z * 26, seed + 3);
    const patch = fbm3(x * 5 + seed, y * 5, z * 5, 3, seed + 9);
    let lightness = 0.86 + (speckle - 0.5) * 0.22 + (patch - 0.5) * 0.3;
    let r = lightness;
    let g = lightness;
    let b = lightness * 0.96;
    if (y < 0.2) {
      const wet = 1 - y / 0.2;
      r *= 1 - 0.34 * wet;
      g *= 1 - 0.3 * wet;
      b *= 1 - 0.26 * wet;
    }
    const mossy = smoothstep(0.5, 0.9, normal.getY(i)) * smoothstep(0.52, 0.72, patch);
    if (mossy > 0) {
      lightness *= 0.8;
      r = lerp(r, 0.34 * lightness, mossy * 0.75);
      g = lerp(g, 0.52 * lightness, mossy * 0.75);
      b = lerp(b, 0.22 * lightness, mossy * 0.75);
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function weldKey(position: THREE.BufferAttribute, index: number): string {
  return `${Math.round(position.getX(index) * 1e4)},${Math.round(position.getY(index) * 1e4)},${Math.round(position.getZ(index) * 1e4)}`;
}

/** Khối đập bê tông: hộp chia ô rồi jitter nhẹ → mặt gãy khúc, không còn là hộp hoàn hảo. */
export function createCliffBlockGeometry(
  width: number,
  height: number,
  depth: number,
  random: () => number,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth, 5, 3, 3);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const offsets = new Map<string, [number, number, number]>();
  const bottom = -height / 2;
  for (let i = 0; i < position.count; i++) {
    const key = weldKey(position, i);
    let offset = offsets.get(key);
    if (!offset) {
      const onBottom = Math.abs(position.getY(i) - bottom) < 1e-6;
      const onTop = Math.abs(position.getY(i) - height / 2) < 1e-6;
      // Đáy và mặt trên giữ phẳng: đáy ngồi vững trên nền, mặt trên để lớp nước phủ không bị nhô qua.
      offset = [
        (random() - 0.5) * width * 0.06,
        onBottom || onTop ? 0 : (random() - 0.5) * height * 0.08,
        (random() - 0.5) * depth * 0.12,
      ];
      offsets.set(key, offset);
    }
    position.setXYZ(
      i,
      position.getX(i) + offset[0],
      position.getY(i) + offset[1],
      position.getZ(i) + offset[2],
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

export interface Placement {
  position: [number, number, number];
  rotationY: number;
  scale: [number, number, number];
  /** Lệch độ sáng nhỏ, [-0.03, 0.03], để các tảng không đồng màu. */
  hue: number;
}

/** Rải tảng đá ven một đường (điểm → điểm), chôn một phần xuống nền, lệch hai bên bờ. */
export function scatterAlongPath(
  path: ReadonlyArray<readonly [number, number]>,
  count: number,
  halfWidth: number,
  spread: number,
  random: () => number,
): Placement[] {
  const placements: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + random() * 0.8) / count;
    const segment = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
    const local = t * (path.length - 1) - segment;
    const [ax, az] = path[segment];
    const [bx, bz] = path[segment + 1];
    const side = random() < 0.5 ? -1 : 1;
    const offset = halfWidth + random() * spread;
    const mass = 0.18 + random() ** 1.6 * 0.5;
    const scale: [number, number, number] = [
      mass * (0.85 + random() * 0.6),
      mass * (0.5 + random() * 0.6),
      mass * (0.85 + random() * 0.6),
    ];
    placements.push({
      position: [ax + (bx - ax) * local + side * offset, -scale[1] * 0.24, az + (bz - az) * local],
      rotationY: random() * Math.PI * 2,
      scale,
      hue: (random() - 0.5) * 0.06,
    });
  }
  return placements;
}

/** Vệt nước dọc (RGBA) để cuộn theo trục v — alpha là vệt bọt trắng trên nền trong suốt. */
export function createStreakTextureData(
  width: number,
  height: number,
  random: () => number,
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  const columnStrength = Array.from({ length: width }, () => 0.35 + random() * 0.65);
  const columnPhase = Array.from({ length: width }, () => random() * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave = (Math.sin(((y + columnPhase[x]) / height) * Math.PI * 6) + 1) / 2;
      // Nền nước liên tục (alpha ≥ 110) + vệt bọt nhẹ, tránh hiệu ứng ô bàn cờ tương phản gắt.
      const alpha = Math.round(110 + 110 * columnStrength[x] * wave);
      const index = (y * width + x) * 4;
      data[index] = 235;
      data[index + 1] = 245;
      data[index + 2] = 250;
      data[index + 3] = alpha;
    }
  }
  return data;
}

export const TERRAIN_CHANNEL_HALF_WIDTH = 3.3;

/**
 * Độ cao địa hình (đơn vị cảnh): lòng sông phẳng ở giữa (nâng nhẹ phía thượng nguồn sau đập), hai
 * bên là sườn đồi rừng dốc dần, phía sau nâng thành dãy núi có chỗ trũng ở giữa (thung lũng chữ V).
 */
export function terrainHeight(x: number, z: number, weirZ: number): number {
  const ax = Math.abs(x);
  const side = smoothstep(TERRAIN_CHANNEL_HALF_WIDTH, TERRAIN_CHANNEL_HALF_WIDTH + 6, ax);
  const slope = smoothstep(TERRAIN_CHANNEL_HALF_WIDTH + 4, TERRAIN_CHANNEL_HALF_WIDTH + 16, ax);
  const sideHeight = side * (2.0 + 5.5 * slope);
  const back = smoothstep(-5, -22, z) * 9 * (0.55 + 0.45 * smoothstep(0, 14, ax));
  const relief = (fbm3(x * 0.16, 0, z * 0.16, 4, 3) - 0.38) * 4.2 * Math.max(side * 0.8, back / 9);
  const bankNoise = (fbm3(x * 0.8, 0, z * 0.8, 3, 11) - 0.5) * 0.3 * side;
  const bed = smoothstep(weirZ + 0.4, weirZ - 0.4, z) * 0.34;
  const bedNoise = valueNoise3(x * 1.4, 0, z * 1.4, 21) * 0.05 * (1 - side);
  return bed + bedNoise + sideHeight + back + relief + bankNoise;
}

/** Lưới địa hình có tô màu đỉnh: cỏ/rừng theo độ cao, đất ven sông, đá lộ trên sườn dốc. */
export function createTerrainGeometry(
  width: number,
  depth: number,
  segmentsX: number,
  segmentsZ: number,
  centerZ: number,
  weirZ: number,
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i) + centerZ;
    position.setXYZ(i, position.getX(i), terrainHeight(position.getX(i), z, weirZ), z);
  }
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const grass = new THREE.Color('#4c7739');
  const forest = new THREE.Color('#2f5c2d');
  const earth = new THREE.Color('#8a7a58');
  const rock = new THREE.Color('#8e8a80');
  const mix = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const patch = fbm3(x * 0.35, 0, z * 0.35, 3, 31);
    mix.copy(grass).lerp(forest, smoothstep(0.8, 5.5, y) * 0.8 + (patch - 0.5) * 0.35);
    const bank =
      (1 -
        smoothstep(
          TERRAIN_CHANNEL_HALF_WIDTH - 0.4,
          TERRAIN_CHANNEL_HALF_WIDTH + 1.6,
          Math.abs(x),
        )) *
      (1 - smoothstep(0.5, 1.4, y));
    mix.lerp(earth, Math.min(1, bank * 0.9));
    mix.lerp(rock, smoothstep(0.78, 0.6, normal.getY(i)) * 0.8);
    const variance = 0.9 + valueNoise3(x * 3, y * 3, z * 3, 5) * 0.2;
    colors[i * 3] = mix.r * variance;
    colors[i * 3 + 1] = mix.g * variance;
    colors[i * 3 + 2] = mix.b * variance;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Bản đồ pháp tuyến sóng nước, lặp liền mạch: tổng các sóng sin với tần số nguyên (nên tuần hoàn
 * theo u, v). Cuộn offset của texture để mặt nước gợn; pháp tuyến tính giải tích từ đạo hàm.
 */
export function createWaterNormalData(size: number, random: () => number): Uint8Array {
  const waves = Array.from({ length: 16 }, () => ({
    kx: Math.round((random() - 0.5) * 22) || 5,
    ky: Math.round((random() - 0.5) * 22) || -7,
    phase: random() * Math.PI * 2,
    amplitude: 0.35 + random() * 0.65,
  }));
  const data = new Uint8Array(size * size * 4);
  const strength = 0.0035;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let dx = 0;
      let dy = 0;
      for (const wave of waves) {
        const angle = Math.PI * 2 * (wave.kx * u + wave.ky * v) + wave.phase;
        const slope = Math.cos(angle) * wave.amplitude * Math.PI * 2;
        dx += slope * wave.kx;
        dy += slope * wave.ky;
      }
      const nx = -dx * strength;
      const ny = -dy * strength;
      const length = Math.hypot(nx, ny, 1);
      const index = (y * size + x) * 4;
      data[index] = Math.round(((nx / length) * 0.5 + 0.5) * 255);
      data[index + 1] = Math.round(((ny / length) * 0.5 + 0.5) * 255);
      data[index + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      data[index + 3] = 255;
    }
  }
  return data;
}
