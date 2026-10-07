import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getGraphicsQualityConfigForCurrentDevice } from '../../utils/graphicsQuality';
import { useReducedMotionScene, useShadows } from './dioramaContext';
import {
  coverPlacements,
  createBladeGeometry,
  patchGrassShader,
  type GrassUniforms,
} from './dioramaCover';
import { seeded, type Placement } from './dioramaGeometry';
import { InstancedPlacements, Instances } from './dioramaKit';
import { useMatrixSetter } from './dioramaMatrices';
import { useSoftSpot } from './dioramaSprites';
import type { HeightFn } from './dioramaTerrain';

/** Lớp phủ mặt đất của diorama: cỏ có gió, lau sậy ven nước, bụi, hoa dại, thân cây đổ, hạt bụi. */

export type CoverTone = 'lush' | 'dry' | 'coast';

const TONES: Record<CoverTone | 'reed', { base: string; tip: string }> = {
  lush: { base: '#2b4a1d', tip: '#a9c75a' },
  dry: { base: '#6b6a2c', tip: '#d8c870' },
  coast: { base: '#4a6a2a', tip: '#b8cf6a' },
  reed: { base: '#5a5a2a', tip: '#c9b86a' },
};

/** Lá cỏ dựng bằng một lệnh vẽ, đung đưa theo gió (đứng yên khi giảm chuyển động). */
export function GrassBlades({
  placements,
  tone,
  sway = 0.28,
}: {
  placements: Placement[];
  tone: CoverTone | 'reed';
  sway?: number;
}) {
  const reducedMotion = useReducedMotionScene();
  const shadows = useShadows();
  const palette = TONES[tone];
  const geometry = useMemo(
    () => createBladeGeometry(palette.base, palette.tip),
    [palette.base, palette.tip],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const apply = useMatrixSetter(placements);
  const uniforms = useRef<GrassUniforms>({ uTime: { value: 0 }, uSway: { value: sway } });
  useEffect(() => {
    uniforms.current.uSway.value = reducedMotion ? 0 : sway;
  }, [reducedMotion, sway]);
  useFrame((state) => {
    if (!reducedMotion) uniforms.current.uTime.value = state.clock.elapsedTime;
  });
  if (placements.length === 0) return null;
  return (
    <instancedMesh
      ref={(mesh) => apply(mesh, '#e6e6e6')}
      args={[geometry, undefined, placements.length]}
      receiveShadow={shadows}
    >
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.95}
        onBeforeCompile={(shader) => patchGrassShader(shader, uniforms.current)}
        customProgramCacheKey={() => 'diorama-grass'}
      />
    </instancedMesh>
  );
}

/** Hạt bụi/phấn hoa lơ lửng trôi chậm trong một hộp; đứng yên khi giảm chuyển động. */
export function Motes({
  box,
  count = 80,
  size = 0.14,
  opacity = 0.5,
  color = '#fff3c4',
  seed = 17,
}: {
  box: { x: [number, number]; y: [number, number]; z: [number, number] };
  count?: number;
  size?: number;
  opacity?: number;
  color?: string;
  seed?: number;
}) {
  const reducedMotion = useReducedMotionScene();
  const spot = useSoftSpot();
  const { geometry, seeds } = useMemo(() => {
    const random = seeded(seed);
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = box.x[0] + random() * (box.x[1] - box.x[0]);
      positions[i * 3 + 1] = box.y[0] + random() * (box.y[1] - box.y[0]);
      positions[i * 3 + 2] = box.z[0] + random() * (box.z[1] - box.z[0]);
      phases[i] = random() * Math.PI * 2;
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: result, seeds: phases };
  }, [box.x, box.y, box.z, count, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const points = useRef<THREE.Points>(null);
  useFrame((state, delta) => {
    if (reducedMotion) return;
    const attribute = points.current?.geometry.getAttribute('position') as
      THREE.BufferAttribute | undefined;
    if (!attribute) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < attribute.count; i++) {
      attribute.setX(i, attribute.getX(i) + Math.sin(t * 0.35 + seeds[i]) * delta * 0.18);
      attribute.setY(i, attribute.getY(i) + Math.cos(t * 0.27 + seeds[i]) * delta * 0.07);
    }
    attribute.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        map={spot}
        size={size}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const FLOWER_COLORS = ['#f4f1e8', '#e8c33a', '#d96aa0', '#9a6ad0'];

export interface MeadowProps {
  height: HeightFn;
  /** Hình chữ nhật (x, z) để rải lớp phủ. */
  area: { x: [number, number]; z: [number, number] };
  tone?: CoverTone;
  /** Hệ số mật độ riêng của cảnh (nhân với hệ số theo cấu hình máy). */
  density?: number;
  /** Chỉ phủ ở độ cao >= minY (trên mực nước/bãi cát). */
  minY?: number;
  maxY?: number;
  /** Loại vị trí (sân lát, nền công trình…). */
  exclude?: (x: number, z: number) => boolean;
  /** Lau sậy mọc trong dải độ cao [lo, hi] quanh mép nước. */
  reeds?: { band: [number, number]; count?: number };
  flowers?: boolean;
  shrubs?: boolean;
  logs?: boolean;
  motes?: boolean;
  seed?: number;
}

/** Hệ số mật độ theo cấu hình máy: yếu giảm mạnh để giữ khung hình. */
function tierFactor(): number {
  const tier = getGraphicsQualityConfigForCurrentDevice().tier;
  return tier === 'low' ? 0.35 : tier === 'medium' ? 0.7 : 1;
}

const LOG_GEOMETRY_RADIUS = 0.07;

export function Meadow({
  height,
  area,
  tone = 'lush',
  density = 1,
  minY = 0.25,
  maxY = 8,
  exclude,
  reeds,
  flowers = true,
  shrubs = true,
  logs = true,
  motes = true,
  seed = 70,
}: MeadowProps) {
  const factor = density * tierFactor();
  const layers = useMemo(() => {
    const sample = (r: () => number): [number, number] => [
      area.x[0] + r() * (area.x[1] - area.x[0]),
      area.z[0] + r() * (area.z[1] - area.z[0]),
    ];
    const accept = exclude ? (x: number, z: number) => !exclude(x, z) : undefined;
    const grass = coverPlacements({
      count: Math.round(26000 * factor),
      seed,
      sample,
      height,
      minY,
      maxY,
      accept,
      size: [0.2, 0.44],
      aspect: 1,
    });
    const reedBlades = reeds
      ? coverPlacements({
          count: Math.round((reeds.count ?? 3600) * factor),
          seed: seed + 1,
          sample,
          height,
          minY: reeds.band[0],
          maxY: reeds.band[1],
          maxSlope: 0.9,
          accept,
          size: [0.5, 0.95],
          aspect: 0.8,
        })
      : [];
    const flowerGroups = flowers
      ? FLOWER_COLORS.map((_, i) =>
          coverPlacements({
            count: Math.round(70 * factor),
            seed: seed + 10 + i,
            sample,
            height,
            minY: minY + 0.05,
            maxY,
            maxSlope: 0.6,
            accept,
            size: [0.05, 0.09],
            sink: -0.11,
          }),
        )
      : [];
    const bushes = shrubs
      ? coverPlacements({
          count: Math.round(70 * factor),
          seed: seed + 20,
          sample,
          height,
          minY: minY + 0.05,
          maxY,
          maxSlope: 0.6,
          accept,
          size: [0.22, 0.46],
          aspect: 1.3,
          sink: 0.04,
        })
      : [];
    const fallen = logs
      ? coverPlacements({
          count: Math.round(10 * factor),
          seed: seed + 30,
          sample,
          height,
          minY: minY + 0.05,
          maxY,
          maxSlope: 0.4,
          accept,
          size: [0.8, 1.5],
          sink: -0.02,
        })
      : [];
    return { grass, reedBlades, flowerGroups, bushes, fallen };
  }, [area, exclude, factor, flowers, height, logs, maxY, minY, reeds, seed, shrubs]);

  const logGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(
      LOG_GEOMETRY_RADIUS,
      LOG_GEOMETRY_RADIUS * 1.1,
      1,
      7,
    );
    geometry.rotateZ(Math.PI / 2);
    return geometry;
  }, []);
  useEffect(() => () => logGeometry.dispose(), [logGeometry]);

  const moteBox = useMemo(
    () => ({
      x: area.x,
      y: [minY + 0.3, minY + 2.2] as [number, number],
      z: area.z,
    }),
    [area, minY],
  );

  return (
    <>
      <GrassBlades placements={layers.grass} tone={tone} />
      {reeds && <GrassBlades placements={layers.reedBlades} tone="reed" sway={0.22} />}
      {layers.flowerGroups.map((group, i) => (
        <Instances
          key={FLOWER_COLORS[i]}
          placements={group}
          seed={seed + 40 + i}
          color={FLOWER_COLORS[i]}
          detail={0}
          amount={0.15}
          roughness={0.7}
          surface="none"
        />
      ))}
      <Instances
        placements={layers.bushes}
        seed={seed + 50}
        color={tone === 'dry' ? '#7d8a45' : '#3e6f33'}
        detail={1}
        amount={0.45}
        roughness={1}
        flat
        surface="leaf"
      />
      <InstancedPlacements
        geometry={logGeometry}
        placements={layers.fallen}
        color="#6a5238"
        roughness={1}
        flat={false}
      />
      {motes && <Motes box={moteBox} count={Math.round(90 * factor)} />}
    </>
  );
}
