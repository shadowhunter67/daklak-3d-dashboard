import * as THREE from 'three';
import { seeded, type Placement } from './dioramaGeometry';
import type { HeightFn } from './dioramaTerrain';
import type { PatchableShader } from './dioramaMaterials';

/**
 * Lớp phủ mặt đất (cỏ, lau sậy, bụi, hoa, vật nhỏ) — phần pure, test được không cần WebGL. Mật độ chi
 * tiết của cảnh chủ yếu đến từ hàng chục nghìn vật nhỏ dùng chung một lệnh vẽ (instancing), đặt theo
 * độ cao/độ dốc của địa hình thay vì rải đều.
 */
export interface CoverSpec {
  count: number;
  seed: number;
  /** Chọn vị trí (x, z); trả null để bỏ qua điểm này. */
  sample: (random: () => number) => [number, number] | null;
  height: HeightFn;
  /** Chỉ đặt ở độ cao trong [minY, maxY] (tránh chìm dưới nước/ trên đỉnh trọc). */
  minY?: number;
  maxY?: number;
  /** Bỏ điểm có độ dốc (|∇h|) lớn hơn ngưỡng — cỏ không mọc trên vách đứng. */
  maxSlope?: number;
  /** Loại thêm theo vị trí (ví dụ sân lát, lòng đường). */
  accept?: (x: number, z: number, y: number) => boolean;
  /** Khoảng chiều cao và độ rộng của vật thể (nhân với kích thước hình học đơn vị). */
  size: [number, number];
  /** Độ rộng so với chiều cao (cỏ mảnh < 1, bụi ~1). */
  aspect?: number;
  /** Chìm xuống đất một đoạn (đơn vị cảnh) để không lơ lửng trên sườn dốc. */
  sink?: number;
}

/** Độ dốc |∇h| bằng sai phân trung tâm. */
export function terrainSlope(height: HeightFn, x: number, z: number, eps = 0.25): number {
  const sx = (height(x + eps, z) - height(x - eps, z)) / (2 * eps);
  const sz = (height(x, z + eps) - height(x, z - eps)) / (2 * eps);
  return Math.hypot(sx, sz);
}

export function coverPlacements(spec: CoverSpec): Placement[] {
  const random = seeded(spec.seed);
  const maxSlope = spec.maxSlope ?? 0.8;
  const aspect = spec.aspect ?? 1;
  const sink = spec.sink ?? 0.01;
  const out: Placement[] = [];
  for (let i = 0; i < spec.count; i++) {
    const spot = spec.sample(random);
    if (!spot) continue;
    const [x, z] = spot;
    const y = spec.height(x, z);
    if (spec.minY !== undefined && y < spec.minY) continue;
    if (spec.maxY !== undefined && y > spec.maxY) continue;
    if (spec.accept && !spec.accept(x, z, y)) continue;
    if (terrainSlope(spec.height, x, z) > maxSlope) continue;
    const h = spec.size[0] + random() * (spec.size[1] - spec.size[0]);
    out.push({
      position: [x, y - sink, z],
      rotationY: random() * Math.PI * 2,
      scale: [h * aspect, h, h * aspect],
      hue: (random() - 0.5) * 0.12,
    });
  }
  return out;
}

/**
 * Lá cỏ đơn vị cao 1: dải tam giác thon dần 3 đoạn + đỉnh, cong về một phía, tô màu đỉnh từ gốc tối
 * lên ngọn sáng (nhân với màu theo từng thể hiện). Pháp tuyến hướng lên để mặt sau cũng sáng đều.
 */
export function createBladeGeometry(
  base = '#2b4a1d',
  tip = '#a9c75a',
  baseWidth = 0.09,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const normals: number[] = [];
  const baseColor = new THREE.Color(base);
  const tipColor = new THREE.Color(tip);
  const mix = new THREE.Color();
  const push = (x: number, y: number, bend: number) => {
    positions.push(x, y, bend);
    mix.copy(baseColor).lerp(tipColor, y);
    colors.push(mix.r, mix.g, mix.b);
    normals.push(0, 0.92, 0.4);
  };
  const segments = 3;
  for (let i = 0; i < segments; i++) {
    const y = i / segments;
    const half = (baseWidth / 2) * (1 - y * 0.85);
    const bend = y * y * 0.3;
    push(-half, y, bend);
    push(half, y, bend);
  }
  push(0, 1, 0.3);
  const indices: number[] = [];
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (segments - 1) * 2;
  indices.push(last, last + 1, segments * 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

export interface GrassUniforms {
  uTime: { value: number };
  uSway: { value: number };
}

/** Gió cho cỏ: dịch đỉnh lá theo sóng sin lệch pha theo vị trí gốc, mạnh dần về ngọn (∝ y²). */
export function patchGrassShader(shader: PatchableShader, uniforms: GrassUniforms): void {
  const target = shader as PatchableShader & { uniforms?: Record<string, { value: number }> };
  if (target.uniforms) {
    target.uniforms.uTime = uniforms.uTime;
    target.uniforms.uSway = uniforms.uSway;
  }
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uSway;')
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
  float grassTip = position.y * position.y;
  vec4 grassOrigin = vec4(0.0, 0.0, 0.0, 1.0);
  #ifdef USE_INSTANCING
  grassOrigin = instanceMatrix * grassOrigin;
  #endif
  float grassPhase = grassOrigin.x * 1.7 + grassOrigin.z * 1.1;
  transformed.x += sin(uTime * 1.7 + grassPhase) * uSway * grassTip;
  transformed.z += cos(uTime * 1.3 + grassPhase * 0.7) * uSway * 0.55 * grassTip;`,
    );
}
