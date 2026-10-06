import * as THREE from 'three';
import { fbm3, seeded, smoothstep, valueNoise3, type Placement } from './dioramaGeometry';

/**
 * Địa hình và cây cối dùng chung cho mọi diorama (hàm thuần, test được không cần WebGL). Mỗi cảnh
 * tự định nghĩa hàm độ cao `HeightFn` và bảng màu; ở đây chỉ có phần dựng lưới/tô màu/rải cây.
 */
export type HeightFn = (x: number, z: number) => number;

export interface TerrainSample {
  x: number;
  y: number;
  z: number;
  /** Thành phần Y của pháp tuyến: 1 = phẳng, nhỏ dần khi dốc. */
  flatness: number;
}
export type TerrainColorFn = (sample: TerrainSample, out: THREE.Color) => void;

export interface HeightfieldSpec {
  width: number;
  depth: number;
  segmentsX: number;
  segmentsZ: number;
  centerX?: number;
  centerZ?: number;
}

/** Lưới địa hình theo hàm độ cao, tô màu đỉnh theo `color`. */
export function createHeightfieldGeometry(
  spec: HeightfieldSpec,
  height: HeightFn,
  color: TerrainColorFn,
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(spec.width, spec.depth, spec.segmentsX, spec.segmentsZ);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const cx = spec.centerX ?? 0;
  const cz = spec.centerZ ?? 0;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + cx;
    const z = position.getZ(i) + cz;
    position.setXYZ(i, x, height(x, z), z);
  }
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const out = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    color(
      {
        x: position.getX(i),
        y: position.getY(i),
        z: position.getZ(i),
        flatness: normal.getY(i),
      },
      out,
    );
    colors[i * 3] = out.r;
    colors[i * 3 + 1] = out.g;
    colors[i * 3 + 2] = out.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export interface PaletteSpec {
  low: string;
  high: string;
  /** Độ cao mà màu `high` chiếm ưu thế. */
  highAt: number;
  rock?: string;
  earth?: string;
  /** Vùng đất ẩm/cát quanh mực nước: dải [waterY - below, waterY + band]. */
  shore?: { color: string; waterY: number; band: number };
  /** Màu đáy nước (cát/bùn) cho phần địa hình chìm dưới y = 0. */
  underwater?: string;
  /** Mức lộ đá ở sườn dốc, 0–1 (mặc định 0,8); đồi nhiệt đới phủ rừng nên để thấp. */
  rockStrength?: number;
}

/** Bảng màu địa hình chuẩn: cỏ → rừng theo độ cao, đá lộ ở sườn dốc, bờ nước màu cát/đất. */
export function makeTerrainColor(spec: PaletteSpec): TerrainColorFn {
  const low = new THREE.Color(spec.low);
  const high = new THREE.Color(spec.high);
  const rock = new THREE.Color(spec.rock ?? '#8e8a80');
  const shore = spec.shore ? new THREE.Color(spec.shore.color) : null;
  const under = spec.underwater ? new THREE.Color(spec.underwater) : null;
  return ({ x, y, z, flatness }, out) => {
    const patch = fbm3(x * 0.35, 0, z * 0.35, 3, 31);
    out.copy(low).lerp(high, smoothstep(0, spec.highAt, y) * 0.85 + (patch - 0.5) * 0.35);
    if (shore && spec.shore) {
      const t = 1 - smoothstep(0, spec.shore.band, y - spec.shore.waterY);
      out.lerp(shore, Math.min(1, Math.max(0, t)) * 0.9);
    }
    out.lerp(rock, smoothstep(0.78, 0.6, flatness) * (spec.rockStrength ?? 0.8));
    if (under) out.lerp(under, smoothstep(0.05, -0.5, y));
    const variance = 0.9 + valueNoise3(x * 3, y * 3, z * 3, 5) * 0.2;
    out.multiplyScalar(variance);
  };
}

export interface ValleySpec {
  /** Nửa bề rộng lòng sông phẳng ở giữa. */
  channelHalf: number;
  /** Độ cao sườn đồi hai bên ở xa nhất. */
  sideHeight: number;
  /** Độ cao dãy núi phía sau (z âm), 0 = không có. */
  backHeight: number;
  /** z bắt đầu nâng dãy núi sau (âm). */
  backStart: number;
  /** Biên độ gồ ghề của sườn đồi. */
  relief: number;
  /** > 1: sườn dốc, vách khép sát lòng sông (hẻm thác); mặc định 1. */
  steepness?: number;
}

/** Thung lũng chữ V: lòng sông phẳng, sườn rừng dốc dần hai bên, núi sau có chỗ trũng ở giữa. */
export function makeValleyHeight(spec: ValleySpec): HeightFn {
  return (x, z) => {
    const ax = Math.abs(x);
    const k = spec.steepness ?? 1;
    const side = smoothstep(spec.channelHalf, spec.channelHalf + 5 / k, ax);
    const slope = smoothstep(spec.channelHalf + 3 / k, spec.channelHalf + 14 / k, ax);
    const sideHeight = side * (spec.sideHeight * 0.35 + spec.sideHeight * 0.65 * slope);
    const back =
      smoothstep(spec.backStart, spec.backStart - 14, z) *
      spec.backHeight *
      (0.55 + 0.45 * smoothstep(0, 12, ax));
    const backShare = spec.backHeight > 0 ? back / spec.backHeight : 0;
    const relief =
      (fbm3(x * 0.16, 0, z * 0.16, 4, 3) - 0.38) * spec.relief * Math.max(side * 0.8, backShare);
    const bank = (fbm3(x * 0.8, 0, z * 0.8, 3, 11) - 0.5) * 0.3 * side;
    const bed = valueNoise3(x * 1.4, 0, z * 1.4, 21) * 0.05 * (1 - side);
    return bed + sideHeight + back + relief + bank;
  };
}

export interface ShoreSpec {
  /** Khoảng cách vào đất liền tại (x, z): > 0 là đất, < 0 là nước, 0 là đường bờ. */
  inland: (x: number, z: number) => number;
  /** Bề dày dải dốc thoải từ bờ lên phần cao trong đất liền. */
  slopeLen: number;
  /** Độ cao phần đồi trong đất liền. */
  inlandHeight: number;
  /** Độ sâu đáy nước (dương). */
  seaDepth: number;
  relief: number;
}

/**
 * Địa hình ven nước (biển, vịnh, đầm, hồ): mặt nước ở y = 0, bờ liên tục tại `inland = 0`, đất liền
 * dốc dần lên thành đồi có nhiễu, đáy nước chìm dần tới `seaDepth`.
 */
export function makeShoreHeight(spec: ShoreSpec): HeightFn {
  return (x, z) => {
    const d = spec.inland(x, z);
    if (d < 0) return -spec.seaDepth * smoothstep(0, 3, -d);
    const hills = 0.7 + 0.6 * fbm3(x * 0.18, 0, z * 0.18, 4, 7);
    const rise = smoothstep(0.4, spec.slopeLen, d) * spec.inlandHeight * hills;
    const relief = (fbm3(x * 0.5, 0, z * 0.5, 3, 17) - 0.45) * spec.relief * smoothstep(0.5, 3, d);
    return 0.3 * smoothstep(0, 0.6, d) + rise + relief;
  };
}

/**
 * Độ đục của bọt nước tại một điểm có độ cao `h` so với mặt nước `level`: bọt ở dải nông sát đường bờ
 * (từ `level - band` đến một chút trên mặt nước), mờ dần khi sâu hơn; `noise` ∈ [0, 1] làm bọt loang.
 */
export function foamAlpha(h: number, level: number, band: number, noise: number): number {
  const depth = level - h;
  if (depth > band) return 0;
  const edge = depth < 0 ? 1 - smoothstep(0, 0.12, -depth) : 1 - smoothstep(0, band, depth);
  return Math.max(0, Math.min(1, edge * (0.45 + 0.75 * noise)));
}

/** Bản đồ bọt (RGBA trắng, alpha = bọt) lấy mẫu từ hàm độ cao trên một hình chữ nhật. */
export function createFoamTextureData(
  size: number,
  center: [number, number],
  extent: [number, number],
  height: HeightFn,
  level: number,
  band: number,
): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      // Ảnh chạy theo (x, -z) vì mặt phẳng được xoay -90° quanh X khi hiển thị.
      const x = center[0] + (i / (size - 1) - 0.5) * extent[0];
      const z = center[1] - (j / (size - 1) - 0.5) * extent[1];
      const noise = fbm3(x * 3.2, 0, z * 3.2, 3, 41);
      const a = foamAlpha(height(x, z), level, band, noise);
      const index = (j * size + i) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(a * 255);
    }
  }
  return data;
}

export interface ForestOptions {
  count: number;
  seed: number;
  /** Chọn vị trí (x, z); trả null để bỏ qua điểm này (ví dụ rơi vào lòng sông). */
  sample: (random: () => number) => [number, number] | null;
  height: HeightFn;
  /** Chỉ trồng ở độ cao >= minY (tránh chìm dưới mặt nước). */
  minY?: number;
  /** Chỉ trồng ở độ cao <= maxY (chừa đỉnh núi trống). */
  maxY?: number;
  trunk?: [number, number];
  width?: [number, number];
  /** Số khối tròn cấu thành tán mỗi cây. */
  blobs?: number;
}

export interface ForestPlacements {
  crowns: Placement[][];
  trunks: Placement[];
}

/** Rải cây lá rộng: thân + cụm khối tán lởm chởm, chia 3 nhóm để mỗi nhóm một sắc xanh. */
export function forestPlacements(options: ForestOptions): ForestPlacements {
  const random = seeded(options.seed);
  const groups: Placement[][] = [[], [], []];
  const trunks: Placement[] = [];
  const [trunkMin, trunkMax] = options.trunk ?? [0.7, 1.5];
  const [widthMin, widthMax] = options.width ?? [0.7, 1.4];
  const blobs = options.blobs ?? 5;
  for (let i = 0; i < options.count; i++) {
    const spot = options.sample(random);
    if (!spot) continue;
    const [x, z] = spot;
    const ground = options.height(x, z);
    if (options.minY !== undefined && ground < options.minY) continue;
    if (options.maxY !== undefined && ground > options.maxY) continue;
    const trunkHeight = trunkMin + random() * (trunkMax - trunkMin);
    const width = widthMin + random() * (widthMax - widthMin);
    trunks.push({
      position: [x, ground - 0.05, z],
      rotationY: 0,
      scale: [1, trunkHeight + 0.1, 1],
      hue: (random() - 0.5) * 0.06,
    });
    for (let k = 0; k < blobs; k++) {
      const w = width * (0.5 + random() * 0.45);
      groups[(i + k) % 3].push({
        position: [
          x + (random() - 0.5) * width * 1.1,
          ground + trunkHeight - 0.15 + random() * 0.7,
          z + (random() - 0.5) * width * 1.1,
        ],
        rotationY: random() * Math.PI * 2,
        scale: [w * (0.9 + random() * 0.5), w * (0.5 + random() * 0.3), w * (0.9 + random() * 0.5)],
        hue: (random() - 0.5) * 0.1,
      });
    }
  }
  return { crowns: groups, trunks };
}

/** Rải tảng/khối ngẫu nhiên trong một vùng, đặt đúng độ cao địa hình, chôn một phần. */
export function scatterOnTerrain(
  count: number,
  seed: number,
  sample: (random: () => number) => [number, number] | null,
  height: HeightFn,
  size: [number, number],
): Placement[] {
  const random = seeded(seed);
  const placements: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const spot = sample(random);
    if (!spot) continue;
    const [x, z] = spot;
    const mass = size[0] + random() ** 1.6 * (size[1] - size[0]);
    const scale: [number, number, number] = [
      mass * (0.85 + random() * 0.6),
      mass * (0.5 + random() * 0.6),
      mass * (0.85 + random() * 0.6),
    ];
    placements.push({
      position: [x, height(x, z) - scale[1] * 0.24, z],
      rotationY: random() * Math.PI * 2,
      scale,
      hue: (random() - 0.5) * 0.06,
    });
  }
  return placements;
}
