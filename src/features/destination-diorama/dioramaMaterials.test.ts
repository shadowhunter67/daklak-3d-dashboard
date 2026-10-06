import { describe, expect, it } from 'vitest';
import { patchSurfaceShader, surfaceMaterialProps, type SurfaceKind } from './dioramaMaterials';
import { createFoamTextureData, foamAlpha } from './dioramaTerrain';

function fakeShader() {
  return {
    vertexShader:
      '#include <common>\n#include <begin_vertex>\n#include <worldpos_vertex>\nvoid main(){}',
    fragmentShader: '#include <common>\n#include <color_fragment>\nvoid main(){}',
  };
}

describe('patchSurfaceShader', () => {
  it.each<SurfaceKind>(['rock', 'leaf', 'ground'])(
    'injects world-space noise and instancing support for %s',
    (kind) => {
      const shader = fakeShader();
      patchSurfaceShader(shader, kind);
      expect(shader.vertexShader).toContain('vDWPos');
      expect(shader.vertexShader).toContain('USE_INSTANCING');
      expect(shader.fragmentShader).toContain('dNoise');
      expect(shader.fragmentShader).toContain('diffuseColor.rgb *=');
    },
  );

  it('only the leaf variant punches holes and only the rock variant adds streaks', () => {
    const rock = fakeShader();
    const leaf = fakeShader();
    patchSurfaceShader(rock, 'rock');
    patchSurfaceShader(leaf, 'leaf');
    expect(leaf.fragmentShader).toContain('discard');
    expect(rock.fragmentShader).not.toContain('discard');
    expect(rock.fragmentShader).toContain('streak');
    expect(leaf.fragmentShader).not.toContain('streak');
  });

  it('gives each variant its own program cache key and reuses the props object', () => {
    expect(surfaceMaterialProps('rock').customProgramCacheKey()).not.toBe(
      surfaceMaterialProps('leaf').customProgramCacheKey(),
    );
    expect(surfaceMaterialProps('rock')).toBe(surfaceMaterialProps('rock'));
  });
});

describe('foam', () => {
  it('is strongest at the waterline, fades with depth and is absent on dry land well above it', () => {
    expect(foamAlpha(0, 0, 0.3, 1)).toBeGreaterThan(foamAlpha(-0.25, 0, 0.3, 1));
    expect(foamAlpha(-0.5, 0, 0.3, 1)).toBe(0);
    expect(foamAlpha(0.6, 0, 0.3, 1)).toBeLessThan(0.05);
  });

  it('builds an RGBA map that only has foam near the shore line', () => {
    const slope = (x: number) => x * 0.1; // mực nước 0 ở x = 0
    const data = createFoamTextureData(32, [0, 0], [10, 10], slope, 0, 0.3);
    expect(data).toHaveLength(32 * 32 * 4);
    let foamy = 0;
    let dry = 0;
    for (let j = 0; j < 32; j++) {
      for (let i = 0; i < 32; i++) {
        const a = data[(j * 32 + i) * 4 + 3];
        const x = (i / 31 - 0.5) * 10;
        if (Math.abs(x) < 0.4) foamy = Math.max(foamy, a);
        if (x > 3) dry = Math.max(dry, a);
      }
    }
    expect(foamy).toBeGreaterThan(80);
    expect(dry).toBe(0);
  });
});
