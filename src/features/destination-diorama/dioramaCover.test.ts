import { describe, expect, it } from 'vitest';
import type * as THREE from 'three';
import {
  coverPlacements,
  createBladeGeometry,
  patchGrassShader,
  terrainSlope,
  type CoverSpec,
} from './dioramaCover';

const flat = () => 1;
const base: CoverSpec = {
  count: 400,
  seed: 5,
  sample: (r) => [(r() - 0.5) * 20, (r() - 0.5) * 20],
  height: flat,
  size: [0.2, 0.4],
};

describe('terrainSlope', () => {
  it('is zero on flat ground and matches the gradient on a ramp', () => {
    expect(terrainSlope(flat, 3, 4)).toBeCloseTo(0, 6);
    expect(terrainSlope((x) => x * 0.5, 1, 1)).toBeCloseTo(0.5, 4);
  });
});

describe('coverPlacements', () => {
  it('is deterministic per seed and sizes each blade inside the requested range', () => {
    const a = coverPlacements(base);
    expect(a).toEqual(coverPlacements(base));
    expect(a).toHaveLength(400);
    for (const p of a) {
      expect(p.scale[1]).toBeGreaterThanOrEqual(0.2);
      expect(p.scale[1]).toBeLessThanOrEqual(0.4);
      expect(p.position[1]).toBeLessThan(1); // chìm nhẹ xuống đất
    }
  });

  it('respects the height window, the slope limit, exclusions and rejected samples', () => {
    expect(coverPlacements({ ...base, minY: 2 })).toHaveLength(0);
    expect(coverPlacements({ ...base, maxY: 0.5 })).toHaveLength(0);
    expect(coverPlacements({ ...base, sample: () => null })).toHaveLength(0);
    // Dốc 1.2 vượt ngưỡng mặc định 0,8: cỏ không mọc trên vách.
    expect(coverPlacements({ ...base, height: (x) => x * 1.2 })).toHaveLength(0);
    const keepRight = coverPlacements({ ...base, accept: (x) => x > 0 });
    expect(keepRight.length).toBeGreaterThan(0);
    expect(keepRight.every((p) => p.position[0] > 0)).toBe(true);
  });

  it('lets a negative sink lift flowers above the ground', () => {
    const lifted = coverPlacements({ ...base, sink: -0.11 });
    expect(lifted.every((p) => p.position[1] > 1)).toBe(true);
  });
});

describe('createBladeGeometry', () => {
  it('is a tapered unit-height strip with a tip, vertex colours and up-pointing normals', () => {
    const geometry = createBladeGeometry();
    const position = geometry.getAttribute('position');
    expect(position.count).toBe(7);
    let top = -1;
    for (let i = 0; i < position.count; i++) top = Math.max(top, position.getY(i));
    expect(top).toBeCloseTo(1, 6);
    expect(geometry.getAttribute('color').count).toBe(7);
    expect(geometry.getAttribute('normal').getY(0)).toBeGreaterThan(0.5);
    expect(geometry.getIndex()!.count).toBe(2 * 6 + 3); // hai ô vuông + tam giác đỉnh
  });
});

describe('patchGrassShader', () => {
  it('adds the wind uniforms and a tip-weighted sway that supports instancing', () => {
    const uniforms = { uTime: { value: 0 }, uSway: { value: 0.3 } };
    const shader = {
      vertexShader: '#include <common>\n#include <begin_vertex>\nvoid main(){}',
      fragmentShader: 'void main(){}',
      uniforms: {} as Record<string, { value: number }>,
    };
    patchGrassShader(shader as unknown as THREE.WebGLProgramParametersWithUniforms, uniforms);
    expect(shader.vertexShader).toContain('uniform float uTime;');
    expect(shader.vertexShader).toContain('USE_INSTANCING');
    expect(shader.vertexShader).toContain('position.y * position.y');
    expect(shader.uniforms.uTime).toBe(uniforms.uTime);
    expect(shader.uniforms.uSway).toBe(uniforms.uSway);
  });
});
