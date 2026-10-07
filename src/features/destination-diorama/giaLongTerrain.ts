import type * as THREE from 'three';
import { fbm3, seeded, smoothstep, type Placement } from './dioramaGeometry';
import {
  makeTerrainColor,
  type HeightFn,
  type PaletteSpec,
  type TerrainColorFn,
} from './dioramaTerrain';

/**
 * Địa hình và bố cục của diorama Thác Gia Long (hàm thuần, test được không cần WebGL).
 * Dòng sông chảy về +z (phía camera), rộng, hạ xuống qua bốn gờ đá bất quy tắc; hai bờ nhô cao
 * thành các bậc, đá lớn làm điểm neo, cây thành cụm. Cầu treo bắc ngang giữa các gờ.
 */
export const GIA_LONG_FIELD = {
  width: 46,
  depth: 40,
  segmentsX: 190,
  segmentsZ: 160,
  centerZ: -6,
};

const TOP_BED = 2.0;
/** Vị trí z danh nghĩa của bốn gờ (thượng → hạ lưu) và độ rơi mỗi gờ. */
export const LIPS = [-8.2, -6.2, -4.3, -2.5] as const;
export const DROPS = [0.4, 0.6, 0.7, 0.6] as const;
/** Mực nước từng tầng (nước nông trên gờ, vũng sâu hơn ở chân): tầng 0 thượng nguồn → tầng 4 vũng. */
export const WATER_LEVELS = [2.14, 1.74, 1.14, 0.44, 0.05] as const;
export const BRIDGE_Z = -5.2;

/** Mép gờ thứ i tại x — không thẳng. */
export function lipZ(i: number, x: number): number {
  return LIPS[i] + (fbm3(x * 0.55, 0, i * 7.3, 3, 11 + i) - 0.5) * 1.5;
}

/** Nửa bề rộng dòng sông tại z. */
export function channelHalf(z: number): number {
  return 5.0 + (fbm3(0, 0, z * 0.3, 2, 3) - 0.5) * 1.4;
}

function bed(x: number, z: number): number {
  let h = TOP_BED;
  for (let i = 0; i < LIPS.length; i++) {
    const lip = lipZ(i, x);
    h -= DROPS[i] * smoothstep(lip - 0.22, lip + 0.22, z);
  }
  return h + (fbm3(x * 1.3, 0, z * 1.3, 3, 5) - 0.5) * 0.16;
}

export const giaLongHeight: HeightFn = (x, z) => {
  const edge = Math.abs(x) + (fbm3(x * 0.4, 0, z * 0.4, 3, 9) - 0.5) * 2.2;
  const t = smoothstep(channelHalf(z), channelHalf(z) + 4.5, edge);
  // Bờ nhô thành bậc (terrace) trộn với sườn mềm.
  const t4 = t * 4;
  const stepped = (Math.floor(t4) + smoothstep(0.6, 1, t4 - Math.floor(t4))) / 4;
  const rise = (t * 0.45 + stepped * 0.55) * 3.4;
  const crag = (fbm3(x * 0.8, 0, z * 0.8, 3, 21) - 0.3) * 0.9 * t;
  const upstream = smoothstep(-13, -24, z) * 4.5;
  const foreground = smoothstep(4.8, 10, z) * 2.4;
  return bed(x, z) + rise + crag + upstream + foreground;
};

const PALETTE: PaletteSpec = {
  low: '#5b7b3a',
  high: '#33602f',
  highAt: 5,
  rock: '#8a8579',
  rockStrength: 0.55,
  shore: { color: '#7d7656', waterY: 0.05, band: 0.55 },
  underwater: '#6f6a58',
};
const BED_COLOR = [0.36, 0.35, 0.31] as const;

/** Bảng màu địa hình: rừng xanh nhiều tông, lòng sông là cuội/đá ướt sẫm. */
export function giaLongColor(): TerrainColorFn {
  const base = makeTerrainColor(PALETTE);
  return (sample, out: THREE.Color) => {
    base(sample, out);
    const inChannel =
      1 -
      smoothstep(
        channelHalf(sample.z) - 0.6,
        channelHalf(sample.z) + 0.9,
        Math.abs(sample.x) + (fbm3(sample.x * 0.6, 0, sample.z * 0.6, 2, 4) - 0.5) * 1.2,
      );
    out.r += (BED_COLOR[0] - out.r) * inChannel * 0.85;
    out.g += (BED_COLOR[1] - out.g) * inChannel * 0.85;
    out.b += (BED_COLOR[2] - out.b) * inChannel * 0.85;
  };
}

export interface FallStrip {
  x: number;
  width: number;
  tier: number;
}
export interface LipLump {
  x: number;
  tier: number;
  size: number;
}

/** Chia mỗi gờ thành các dải nước đổ xen kẽ khối đá nhô (mép thác bị chẻ nhỏ). */
export function lipLayout(seed: number): { strips: FallStrip[]; lumps: LipLump[] } {
  const random = seeded(seed);
  const strips: FallStrip[] = [];
  const lumps: LipLump[] = [];
  for (let tier = 0; tier < LIPS.length; tier++) {
    const half = channelHalf(LIPS[tier]) - 0.3;
    let x = -half;
    while (x < half) {
      const gap = 0.8 + random() * 1.5;
      lumps.push({ x: x + gap / 2, tier, size: 0.45 + random() * 0.5 });
      x += gap;
      const width = 0.6 + random() ** 1.3 * 1.2;
      if (x + width > half) break;
      strips.push({ x: x + width / 2, width, tier });
      x += width;
    }
  }
  return { strips, lumps };
}

function place(random: () => number, x: number, z: number, size: number, sink = 0.24): Placement {
  const scale: [number, number, number] = [
    size * (0.85 + random() * 0.7),
    size * (0.5 + random() * 0.6),
    size * (0.85 + random() * 0.7),
  ];
  return {
    position: [x, giaLongHeight(x, z) - scale[1] * sink, z],
    rotationY: random() * Math.PI * 2,
    scale,
    hue: (random() - 0.5) * 0.07,
  };
}

export interface GiaLongRocks {
  big: Placement[];
  medium: Placement[];
  small: Placement[];
}

/** Đá có thứ bậc: tảng lớn làm điểm neo trên bờ, cụm đá vừa quanh nó, đá nhỏ ven nước và trong vũng. */
export function giaLongRocks(seed: number, lumps: LipLump[]): GiaLongRocks {
  const random = seeded(seed);
  const big: Placement[] = [];
  const medium: Placement[] = [];
  const small: Placement[] = [];
  for (let i = 0; i < 16; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -11 + random() * 14;
    const x = side * (channelHalf(z) + 0.2 + random() * 2.2);
    big.push(place(random, x, z, 1.1 + random() * 0.9));
    for (let k = 0; k < 3; k++) {
      medium.push(
        place(random, x + (random() - 0.5) * 3, z + (random() - 0.5) * 3, 0.5 + random() * 0.45),
      );
    }
  }
  for (const lump of lumps) {
    medium.push(place(random, lump.x, lipZ(lump.tier, lump.x), lump.size, 0.15));
  }
  for (let i = 0; i < 70; i++) {
    const side = random() < 0.5 ? -1 : 1;
    const z = -10 + random() * 13;
    small.push(
      place(random, side * (channelHalf(z) - 0.8 + random() * 2.2), z, 0.15 + random() * 0.2),
    );
  }
  for (let i = 0; i < 14; i++) {
    // Đá nhô lên khỏi mặt nước trong vũng chân thác.
    small.push(
      place(random, (random() - 0.5) * 8.4, -2.0 + random() * 5, 0.55 + random() * 0.45, 0.08),
    );
  }
  return { big, medium, small };
}

/** Điểm lấy mẫu cây theo cụm (không phân bố đều) và không rơi vào lòng sông. */
export function clusteredSampler(
  seed: number,
  clusters: number,
  radius: number,
  zRange: [number, number],
) {
  const random = seeded(seed);
  const centers = Array.from({ length: clusters }, () => {
    const z = zRange[0] + random() * (zRange[1] - zRange[0]);
    return {
      x: (random() < 0.5 ? -1 : 1) * (channelHalf(z) + 2.5 + random() * 11),
      z,
      r: radius * (0.6 + random() * 0.8),
    };
  });
  return (r: () => number): [number, number] | null => {
    const c = centers[Math.floor(r() * centers.length)];
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * c.r;
    const x = c.x + Math.cos(a) * d;
    const z = c.z + Math.sin(a) * d;
    return Math.abs(x) < channelHalf(z) + 1.2 ? null : [x, z];
  };
}
