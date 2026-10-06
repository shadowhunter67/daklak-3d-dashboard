import type * as THREE from 'three';

/**
 * Chi tiết bề mặt sinh bằng shader (không texture/ảnh ngoài): nhiễu giá trị 3D theo toạ độ thế giới
 * làm loang màu đá/đất, sọc ẩm dọc vách đá, và tán lá có lỗ + tối dần về phía dưới (AO giả). Gắn qua
 * `onBeforeCompile` của MeshStandardMaterial nên vẫn dùng ánh sáng/bóng/môi trường chuẩn của three.
 * Mỗi biến thể có `customProgramCacheKey` riêng để three không dùng nhầm chương trình đã biên dịch.
 */
export type SurfaceKind = 'rock' | 'leaf' | 'ground';

interface SurfaceSettings {
  /** Tần số nhiễu (cao hơn = vân mịn hơn). */
  scale: number;
  /** Biên độ loang sáng/tối quanh 1, 0–1. */
  strength: number;
  /** Cường độ sọc ẩm dọc (đá), 0 = không. */
  streaks: number;
  /** Ngưỡng cắt lỗ lá (0 = không cắt). */
  leafCut: number;
  /** Mức tối của phần chân tán so với đỉnh (AO giả), 0 = không. */
  ao: number;
}

export const SURFACE_SETTINGS: Record<SurfaceKind, SurfaceSettings> = {
  rock: { scale: 5.5, strength: 0.34, streaks: 0.28, leafCut: 0, ao: 0 },
  leaf: { scale: 3.2, strength: 0.22, streaks: 0, leafCut: 0.3, ao: 0.42 },
  ground: { scale: 1.6, strength: 0.16, streaks: 0, leafCut: 0, ao: 0 },
};

const NOISE_GLSL = `
varying vec3 vDWPos;
varying float vDLocalY;
float dHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(dHash(i), dHash(i + vec3(1.0, 0.0, 0.0)), f.x),
                mix(dHash(i + vec3(0.0, 1.0, 0.0)), dHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
  float b = mix(mix(dHash(i + vec3(0.0, 0.0, 1.0)), dHash(i + vec3(1.0, 0.0, 1.0)), f.x),
                mix(dHash(i + vec3(0.0, 1.0, 1.0)), dHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
  return mix(a, b, f.z);
}`;

const num = (v: number) => v.toFixed(3);

export interface PatchableShader {
  vertexShader: string;
  fragmentShader: string;
}

/** Chèn mã chi tiết bề mặt vào shader của MeshStandardMaterial (tách riêng để test được). */
export function patchSurfaceShader(shader: PatchableShader, kind: SurfaceKind): void {
  const s = SURFACE_SETTINGS[kind];
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>\nvarying vec3 vDWPos;\nvarying float vDLocalY;`,
    )
    .replace('#include <begin_vertex>', `#include <begin_vertex>\nvDLocalY = position.y;`)
    .replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
vec4 dioramaWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
dioramaWorld = instanceMatrix * dioramaWorld;
#endif
vDWPos = (modelMatrix * dioramaWorld).xyz;`,
    );
  const streak =
    s.streaks > 0
      ? `float streak = dNoise(vec3(vDWPos.x * ${num(s.scale * 1.6)}, vDWPos.y * ${num(s.scale * 0.22)}, vDWPos.z * ${num(s.scale * 1.6)}));
  diffuseColor.rgb *= 1.0 - ${num(s.streaks)} * smoothstep(0.55, 0.9, streak);`
      : '';
  const leaf =
    s.leafCut > 0
      ? `if (dNoise(vDWPos * ${num(s.scale * 5.0)} + 11.0) < ${num(s.leafCut)}) discard;`
      : '';
  const ao =
    s.ao > 0
      ? `diffuseColor.rgb *= mix(${num(1 - s.ao)}, 1.08, smoothstep(-0.9, 0.9, vDLocalY));`
      : '';
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${NOISE_GLSL}`)
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
  float dioramaN = dNoise(vDWPos * ${num(s.scale)}) * 0.65 + dNoise(vDWPos * ${num(s.scale * 3.1)} + 7.0) * 0.35;
  diffuseColor.rgb *= mix(${num(1 - s.strength)}, ${num(1 + s.strength * 0.4)}, dioramaN);
  ${streak}
  ${ao}
  ${leaf}`,
    );
}

interface SurfaceProps {
  onBeforeCompile: (shader: THREE.WebGLProgramParametersWithUniforms) => void;
  customProgramCacheKey: () => string;
}
const PROPS_CACHE: Partial<Record<SurfaceKind, SurfaceProps>> = {};

/** Thuộc tính cho `<meshStandardMaterial>`: gắn chi tiết bề mặt theo loại (đối tượng dùng chung). */
export function surfaceMaterialProps(kind: SurfaceKind): SurfaceProps {
  return (PROPS_CACHE[kind] ??= {
    onBeforeCompile: (shader) => patchSurfaceShader(shader, kind),
    customProgramCacheKey: () => `diorama-surface-${kind}`,
  });
}
