import { useEffect, useMemo } from 'react';
import { Meadow } from '../dioramaCoverLayer';
import type { CameraPoses, DioramaSceneProps } from '../dioramaConfig';
import { createCliffBlockGeometry, seeded, type Placement } from '../dioramaGeometry';
import {
  DioramaCanvas,
  FallingWater,
  Forest,
  Heightfield,
  Instances,
  Mist,
  WaterSheet,
} from '../dioramaKit';
import { BanyanRoots, Box, Elephant, SuspensionBridge } from '../dioramaProps';
import {
  forestPlacements,
  makeTerrainColor,
  makeValleyHeight,
  scatterOnTerrain,
  type HeightfieldSpec,
  type PaletteSpec,
} from '../dioramaTerrain';
import { useShadows } from '../dioramaContext';

/**
 * Thác nước và ghềnh sông. Mỗi cảnh là một bộ thông số nhỏ cho `CascadeScene` (thác bậc) hoặc
 * `RapidsScene` (ghềnh/sông nông). Bố cục dựa trên ảnh Commons đã dẫn (cảnh `photo`) hoặc chỉ trên
 * mô tả văn bản của nguồn (cảnh `text`) — xem `DIORAMA_BASIS`.
 */
const FIELD: HeightfieldSpec = {
  width: 46,
  depth: 40,
  segmentsX: 150,
  segmentsZ: 130,
  centerZ: -6,
};

const LUSH: PaletteSpec = {
  low: '#4c7739',
  high: '#2f5c2d',
  highAt: 5.5,
  rockStrength: 0.35,
  shore: { color: '#8a7a58', waterY: 0, band: 0.9 },
};
const DRY: PaletteSpec = {
  low: '#a09a55',
  high: '#6f7a3c',
  highAt: 5,
  shore: { color: '#a8946a', waterY: 0, band: 0.9 },
};

const COVER_AREA = { x: [-18, 18] as [number, number], z: [-20, 6] as [number, number] };
const POOL_REEDS = { band: [0.09, 0.5] as [number, number], count: 1800 };
const RIVER_REEDS = { band: [0.1, 0.55] as [number, number], count: 2600 };

interface Stream {
  x: number;
  width: number;
}
interface Tier {
  top: number;
  z: number;
  width: number;
  depth: number;
  streams: Stream[];
}
interface CascadeSpec {
  tiers: Tier[];
  pool: [number, number];
  channelHalf: number;
  boulders: number;
  mist: number;
  rock: string;
  seed: number;
  /** Màu nước/bọt khi thác đục (mùa lũ) thay vì xanh trong. */
  tint?: string;
  waterColor?: string;
  /** Cầu treo bắc ngang đỉnh thác (Gia Long). */
  bridge?: { y: number; z: number; from: number; to: number };
  /** Cây đa/si bám đá bên bờ + đá tảng lớn (Đray K'nao). */
  banyan?: { position: [number, number, number]; scale: number }[];
  bigRocks?: number;
}

function cascadePoses(spec: CascadeSpec): CameraPoses {
  const first = spec.tiers[0];
  const last = spec.tiers[spec.tiers.length - 1];
  const midZ = (first.z + last.z) / 2;
  return {
    overview: { position: [4, first.top + 3.2, last.z + 13], target: [0, first.top * 0.35, midZ] },
    close: { position: [1.6, 1.3, last.z + 5.6], target: [0, first.top * 0.5, midZ] },
    high: {
      position: [4, first.top + 4.2, first.z + 6],
      target: [0, first.top * 0.5, first.z - 1.5],
    },
  };
}

function CascadeScene({ spec, ...scene }: DioramaSceneProps & { spec: CascadeSpec }) {
  const shadows = useShadows();
  const poses = useMemo(() => cascadePoses(spec), [spec]);
  const height = useMemo(
    () =>
      makeValleyHeight({
        channelHalf: spec.channelHalf,
        sideHeight: spec.tiers[0].top + 4.5,
        backHeight: 7,
        backStart: spec.tiers[0].z - 4,
        relief: 4,
        steepness: 1.5,
      }),
    [spec],
  );
  const color = useMemo(() => makeTerrainColor(LUSH), []);
  const blocks = useMemo(() => {
    const random = seeded(spec.seed);
    return spec.tiers.map((t) => createCliffBlockGeometry(t.width, t.top, t.depth, random));
  }, [spec]);
  useEffect(() => () => blocks.forEach((g) => g.dispose()), [blocks]);

  const first = spec.tiers[0];
  const last = spec.tiers[spec.tiers.length - 1];
  const frontZ = last.z + last.depth / 2;
  const poolZ = frontZ + (spec.pool[1] / 2) * 0.55;
  const backEdge = first.z - first.depth / 2;

  const rocks = useMemo(
    () =>
      scatterOnTerrain(
        spec.boulders,
        spec.seed + 1,
        (r) => [(r() - 0.5) * (spec.channelHalf * 2 + 3), last.z + 0.5 + r() * 5],
        height,
        [0.25, 0.8],
      ).map((p) => ({
        ...p,
        scale: [p.scale[0] * 1.6, p.scale[1] * 1.4, p.scale[2] * 1.6] as [number, number, number],
      })),
    [spec, height, last.z],
  );
  const trees = useMemo(
    () =>
      forestPlacements({
        count: 300,
        seed: spec.seed + 2,
        height,
        minY: 0.3,
        sample: (r) => [
          (r() < 0.5 ? -1 : 1) * (spec.channelHalf + 2.2 + r() ** 0.8 * 12),
          -20 + r() * 23,
        ],
      }),
    [spec, height],
  );
  // Đá phủ mép thác và hai bên vách: phá đường nét thẳng của khối bậc, tạo vách hẻm tự nhiên.
  const rim = useMemo(() => {
    const random = seeded(spec.seed + 9);
    const list: Placement[] = [];
    for (const tier of spec.tiers) {
      const lipZ = tier.z + tier.depth / 2;
      const n = Math.round(tier.width * 2.4);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1) - 0.5) * (tier.width + 1.2);
        if (tier.streams.some((s) => Math.abs(x - s.x) < s.width / 2 + 0.05)) continue;
        const s = 0.25 + random() * 0.35;
        list.push({
          position: [x, tier.top - 0.05 - random() * 0.1, lipZ - 0.05 + random() * 0.15],
          rotationY: random() * 6,
          scale: [s * 1.3, s, s * 1.2],
          hue: (random() - 0.5) * 0.06,
        });
      }
      for (const side of [-1, 1]) {
        for (let k = 0; k < Math.ceil(tier.top / 0.7); k++) {
          const s = 0.7 + random() * 0.5;
          list.push({
            position: [
              side * (tier.width / 2 + 0.15 + random() * 0.3),
              k * 0.7 - 0.1,
              tier.z + (random() - 0.5) * tier.depth,
            ],
            rotationY: random() * 6,
            scale: [s, s * 0.9, s],
            hue: (random() - 0.5) * 0.06,
          });
        }
      }
    }
    return list;
  }, [spec]);
  const bigRocks = useMemo(
    () =>
      scatterOnTerrain(
        spec.bigRocks ?? 0,
        spec.seed + 4,
        (r) => [
          (r() < 0.5 ? -1 : 1) * (1 + r() * (spec.channelHalf + 1)),
          last.z + 0.2 + r() * 4.5,
        ],
        height,
        [1.0, 1.9],
      ),
    [spec, height, last.z],
  );
  const mistX = last.streams.reduce((sum, s) => sum + s.x, 0) / last.streams.length;
  const mistCenter = useMemo<[number, number, number]>(
    () => [mistX, 0.1, frontZ + 0.6],
    [mistX, frontZ],
  );
  const mistSpread = useMemo<[number, number]>(() => [last.width * 0.8, 1.6], [last.width]);

  return (
    <DioramaCanvas poses={poses} {...scene}>
      <Heightfield spec={FIELD} height={height} color={color} />
      <Forest placements={trees} />
      <Meadow
        height={height}
        area={COVER_AREA}
        minY={0.3}
        reeds={POOL_REEDS}
        seed={spec.seed + 500}
      />
      <Instances placements={rim} seed={7} color="#8a857b" detail={2} amount={0.3} cuts={5} flat />
      {spec.tiers.map((tier, i) => {
        const drop = tier.top - (spec.tiers[i + 1]?.top ?? 0);
        return (
          <group key={tier.z}>
            <mesh
              geometry={blocks[i]}
              position={[0, tier.top / 2, tier.z]}
              castShadow={shadows}
              receiveShadow={shadows}
            >
              <meshStandardMaterial color={spec.rock} roughness={0.95} />
            </mesh>
            <Box
              position={[0, tier.top + 0.012, tier.z]}
              size={[tier.width * 0.82, 0.02, tier.depth * 0.96]}
              color={spec.waterColor ?? '#5da7b8'}
              roughness={0.3}
            />
            {tier.streams.map((s) => (
              <FallingWater
                key={s.x}
                position={[s.x, tier.top - drop / 2, tier.z + tier.depth / 2 + 0.14]}
                width={s.width}
                height={drop}
                tint={spec.tint}
                seed={Math.round(tier.z * 10 + s.x * 7)}
              />
            ))}
          </group>
        );
      })}
      <Box
        position={[0, first.top / 2, backEdge - 7]}
        size={[spec.channelHalf * 2 + 0.8, first.top, 14]}
        color={spec.rock}
      />
      <WaterSheet
        position={[0, first.top + 0.03, backEdge - 7]}
        size={[spec.channelHalf * 2, 14]}
        color={spec.waterColor ?? '#33727f'}
        opacity={0.92}
      />
      <WaterSheet
        position={[0, 0.07, poolZ]}
        size={spec.pool}
        shape="ellipse"
        color={spec.waterColor ?? '#3c7f8c'}
      />
      {spec.bridge && <SuspensionBridge {...spec.bridge} />}
      {spec.bridge &&
        [-1, 1].map((side) => (
          <Box
            key={`kè${side}`}
            position={[side * (spec.channelHalf - 0.1), 0.5, last.z + 0.2]}
            size={[0.7, 1.0, 5]}
            color="#8f897c"
          />
        ))}
      {spec.banyan?.map((b, i) => (
        <BanyanRoots key={i} position={b.position} scale={b.scale} seed={spec.seed + i} />
      ))}
      {bigRocks.length > 0 && (
        <Instances
          placements={bigRocks}
          seed={11}
          color="#7d7a70"
          detail={2}
          amount={0.35}
          cuts={6}
          flat
        />
      )}
      <Mist
        center={mistCenter}
        spread={mistSpread}
        count={spec.mist}
        rise={0.6 + first.top * 0.2}
      />
      <Instances
        placements={rocks}
        seed={3}
        color="#8f8b80"
        detail={2}
        amount={0.3}
        cuts={5}
        flat
      />
    </DioramaCanvas>
  );
}

const DRAY_NUR: CascadeSpec = {
  tiers: [
    {
      top: 2.4,
      z: -3.2,
      width: 7.2,
      depth: 1.8,
      streams: [
        { x: -2.3, width: 2.7 },
        { x: 0.2, width: 2.7 },
        { x: 2.5, width: 2.1 },
      ],
    },
  ],
  pool: [7.6, 4.8],
  channelHalf: 4.2,
  boulders: 26,
  mist: 130,
  rock: '#6f6a60',
  seed: 101,
};
const GIA_LONG: CascadeSpec = {
  // Ảnh: thác rất rộng, nước đục nâu cuồn cuộn qua một bậc thấp, cầu treo dây bắc ngang đỉnh.
  tiers: [
    {
      top: 1.3,
      z: -3.4,
      width: 9.4,
      depth: 1.8,
      streams: [
        { x: -3.1, width: 3.0 },
        { x: 0, width: 3.2 },
        { x: 3.1, width: 3.0 },
      ],
    },
  ],
  pool: [8.4, 4.2],
  channelHalf: 5,
  boulders: 18,
  mist: 150,
  rock: '#6a6459',
  seed: 111,
  tint: '#c9ab8a',
  waterColor: '#a98c6c',
  bridge: { y: 2.1, z: -2.6, from: -4.9, to: 4.9 },
};
const THUY_TIEN: CascadeSpec = {
  tiers: [
    { top: 2.6, z: -4.8, width: 2.0, depth: 1.5, streams: [{ x: 0, width: 1.0 }] },
    {
      top: 1.7,
      z: -3.2,
      width: 4.6,
      depth: 1.8,
      streams: [
        { x: -1.4, width: 0.9 },
        { x: 0.2, width: 1.3 },
        { x: 1.6, width: 0.9 },
      ],
    },
    {
      top: 0.85,
      z: -1.6,
      width: 4.0,
      depth: 1.4,
      streams: [
        { x: -0.8, width: 1.4 },
        { x: 1.0, width: 1.2 },
      ],
    },
  ],
  pool: [4.8, 3.0],
  channelHalf: 3,
  boulders: 44,
  mist: 70,
  rock: '#7d776c',
  seed: 121,
};
const DRAY_KNAO: CascadeSpec = {
  // Ảnh: ghềnh đá tảng xám phủ rêu, nước trắng chảy giữa hai bờ rừng, cây đa rễ khổng lồ bám đá.
  tiers: [
    { top: 1.5, z: -4.2, width: 2.6, depth: 1.5, streams: [{ x: 0, width: 1.5 }] },
    { top: 0.6, z: -2.4, width: 3.0, depth: 1.4, streams: [{ x: 0.2, width: 1.8 }] },
  ],
  pool: [3.8, 2.4],
  channelHalf: 3,
  boulders: 34,
  mist: 55,
  rock: '#6b6a5f',
  seed: 131,
  bigRocks: 7,
  banyan: [
    { position: [3.6, 0, -1.4], scale: 1.4 },
    { position: [-4.2, 0, -2.2], scale: 1.0 },
  ],
};

export function DrayNurScene(props: DioramaSceneProps) {
  return <CascadeScene spec={DRAY_NUR} {...props} />;
}
export function GiaLongScene(props: DioramaSceneProps) {
  return <CascadeScene spec={GIA_LONG} {...props} />;
}
export function ThuyTienScene(props: DioramaSceneProps) {
  return <CascadeScene spec={THUY_TIEN} {...props} />;
}
export function DrayKnaoScene(props: DioramaSceneProps) {
  return <CascadeScene spec={DRAY_KNAO} {...props} />;
}

interface RapidsSpec {
  riverHalf: number;
  water: string;
  opacity: number;
  rocks: number;
  rockSize: [number, number];
  rockColor: string;
  drops: number;
  palette: PaletteSpec;
  forest: 'lush' | 'dry';
  trees: number;
  elephants: number;
  seed: number;
}

const RAPIDS_POSES: CameraPoses = {
  overview: { position: [3.5, 3.0, 9], target: [0, 0.3, -3] },
  close: { position: [1.2, 0.8, 3], target: [0, 0.4, -2] },
  high: { position: [3, 5, 0], target: [0, 0.4, -5] },
};

function RapidsScene({ spec, ...scene }: DioramaSceneProps & { spec: RapidsSpec }) {
  const height = useMemo(
    () =>
      makeValleyHeight({
        channelHalf: spec.riverHalf,
        sideHeight: spec.forest === 'dry' ? 2.4 : 5,
        backHeight: spec.forest === 'dry' ? 3 : 7,
        backStart: -8,
        relief: spec.forest === 'dry' ? 1.6 : 4,
      }),
    [spec],
  );
  const color = useMemo(() => makeTerrainColor(spec.palette), [spec]);
  const rocks = useMemo(
    () =>
      scatterOnTerrain(
        spec.rocks,
        spec.seed,
        (r) => [(r() - 0.5) * (spec.riverHalf * 2.2), -8 + r() * 14],
        height,
        spec.rockSize,
      ),
    [spec, height],
  );
  const trees = useMemo(
    () =>
      forestPlacements({
        count: spec.trees,
        seed: spec.seed + 2,
        height,
        minY: 0.15,
        sample: (r) => [
          (r() < 0.5 ? -1 : 1) * (spec.riverHalf + 1.2 + r() ** 0.8 * 13),
          -20 + r() * 24,
        ],
      }),
    [spec, height],
  );
  const drops = useMemo(() => {
    const random = seeded(spec.seed + 3);
    return Array.from({ length: spec.drops }, (_, i) => ({
      z: -5 + i * (8 / Math.max(1, spec.drops)),
      h: 0.14 + random() * 0.14,
      x: (random() - 0.5) * spec.riverHalf,
      w: spec.riverHalf * (0.5 + random() * 0.6),
    }));
  }, [spec]);
  const tones: [string, string, string] =
    spec.forest === 'dry' ? ['#6f7a3a', '#808a45', '#8c8a4c'] : ['#27562a', '#336a2f', '#486f35'];
  return (
    <DioramaCanvas poses={RAPIDS_POSES} {...scene}>
      <Heightfield spec={FIELD} height={height} color={color} />
      <Forest placements={trees} tones={tones} />
      <Meadow
        height={height}
        area={COVER_AREA}
        tone={spec.forest === 'dry' ? 'dry' : 'lush'}
        minY={0.25}
        reeds={RIVER_REEDS}
        seed={spec.seed + 500}
      />
      <WaterSheet
        position={[0, 0.07, -8]}
        size={[spec.riverHalf * 2, 56]}
        color={spec.water}
        opacity={spec.opacity}
      />
      {drops.map((d) => (
        <group key={d.z}>
          <Box position={[d.x, d.h / 2, d.z]} size={[d.w, d.h, 0.5]} color={spec.rockColor} />
          <FallingWater
            position={[d.x, d.h / 2, d.z + 0.3]}
            width={d.w * 0.8}
            height={d.h}
            seed={Math.round(d.z * 9)}
          />
        </group>
      ))}
      <Instances
        placements={rocks}
        seed={5}
        color={spec.rockColor}
        detail={2}
        amount={0.3}
        cuts={5}
        flat
      />
      {Array.from({ length: spec.elephants }).map((_, i) => (
        <Elephant
          key={i}
          position={[
            spec.riverHalf + 2 + i * 1.8,
            height(spec.riverHalf + 2 + i * 1.8, -4 + i),
            -4 + i,
          ]}
          rotationY={-1.2 + i * 0.4}
          scale={0.85}
        />
      ))}
    </DioramaCanvas>
  );
}

const BAY_NHANH: RapidsSpec = {
  riverHalf: 4.2,
  water: '#9a8a5a',
  opacity: 0.78,
  rocks: 90,
  rockSize: [0.1, 0.5],
  rockColor: '#6f6a5e',
  drops: 5,
  palette: LUSH,
  forest: 'lush',
  trees: 220,
  elephants: 0,
  seed: 201,
};
const EA_SO: RapidsSpec = {
  riverHalf: 3,
  water: '#4a8f86',
  opacity: 0.8,
  rocks: 60,
  rockSize: [0.15, 0.6],
  rockColor: '#6a675f',
  drops: 2,
  palette: LUSH,
  forest: 'lush',
  trees: 320,
  elephants: 0,
  seed: 211,
};
const YOK_DON: RapidsSpec = {
  riverHalf: 6,
  water: '#8a6a4a',
  opacity: 0.92,
  rocks: 24,
  rockSize: [0.2, 0.6],
  rockColor: '#7a7468',
  drops: 0,
  palette: DRY,
  forest: 'dry',
  trees: 140,
  elephants: 0,
  seed: 221,
};

export function BayNhanhScene(props: DioramaSceneProps) {
  return <RapidsScene spec={BAY_NHANH} {...props} />;
}
export function EaSoScene(props: DioramaSceneProps) {
  return <RapidsScene spec={EA_SO} {...props} />;
}
export function YokDonScene(props: DioramaSceneProps) {
  return <RapidsScene spec={YOK_DON} {...props} />;
}
