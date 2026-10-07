import { useMemo, type ReactNode } from 'react';
import { Meadow, type CoverTone } from '../dioramaCoverLayer';
import type { CameraPoses, DioramaSceneProps, SkySpec } from '../dioramaConfig';
import { seeded, smoothstep } from '../dioramaGeometry';
import {
  DioramaCanvas,
  Forest,
  Heightfield,
  Instances,
  ShoreFoam,
  WaterSheet,
} from '../dioramaKit';
import {
  BasaltColumns,
  Boat,
  Box,
  Cylinder,
  Elephant,
  Palm,
  StiltLonghouse,
} from '../dioramaProps';
import {
  forestPlacements,
  makeShoreHeight,
  makeTerrainColor,
  scatterOnTerrain,
  type HeightFn,
  type HeightfieldSpec,
} from '../dioramaTerrain';

/**
 * Cảnh ven nước: hồ, đầm, vịnh, mũi đất, bờ biển. Mặt nước ở y = 0; địa hình dựng từ `ShoreSpec`
 * (hàm "khoảng cách vào đất liền"). Bố cục theo ảnh Commons đã dẫn (`photo`) hoặc mô tả văn bản
 * (`text`) — xem `DIORAMA_BASIS`.
 */
const FIELD: HeightfieldSpec = {
  width: 64,
  depth: 48,
  segmentsX: 170,
  segmentsZ: 130,
  centerZ: -4,
};

const SEA_SKY: SkySpec = { top: '#5fa0d8', mid: '#a9d0e8', bottom: '#dcebf0', fogFar: 60 };
const LAKE_SKY: SkySpec = { top: '#8fa9bb', mid: '#c4d1d6', bottom: '#dfe6e6', fogFar: 55 };

const COVER_AREA = { x: [-26, 26] as [number, number], z: [-24, 8] as [number, number] };

interface ShoreSceneSpec {
  inland: (x: number, z: number) => number;
  slopeLen: number;
  inlandHeight: number;
  seaDepth: number;
  relief: number;
  /** Hạ thấp đất liền ở phía trước (z lớn) để camera nhìn thấy mặt nước; z bắt đầu hạ. */
  frontLow?: number;
  /** Dãy núi nền phía sau (z âm), 0 = không. */
  ridge?: number;
  water: string;
  opacity?: number;
  sand: string;
  underwater: string;
  low: string;
  high: string;
  trees: number;
  /** Độ cao tối thiểu để trồng cây (mặc định 0,6). */
  treeMinY?: number;
  /** Bề dày dải cát quanh mực nước (mặc định 0,7). */
  shoreBand?: number;
  seed: number;
  poses: CameraPoses;
  sky: SkySpec;
  extras?: (height: HeightFn) => ReactNode;
  /** Màu/tông lớp phủ cỏ (mặc định ven biển). */
  coverTone?: CoverTone;
  /** Dải độ cao mọc lau sậy (hồ/đầm: ngay sát mép nước). */
  reedBand?: [number, number];
}

function ShoreScene({ spec, ...scene }: DioramaSceneProps & { spec: ShoreSceneSpec }) {
  const height = useMemo(() => {
    const shore = makeShoreHeight({
      inland: spec.inland,
      slopeLen: spec.slopeLen,
      inlandHeight: spec.inlandHeight,
      seaDepth: spec.seaDepth,
      relief: spec.relief,
    });
    const ridge = spec.ridge ?? 0;
    const frontLow = spec.frontLow;
    return (x: number, z: number) => {
      const h = shore(x, z);
      const keep = h > 0 && frontLow !== undefined ? smoothstep(frontLow + 5, frontLow, z) : 1;
      return h * (h > 0 ? 0.25 + 0.75 * keep : 1) + (ridge ? smoothstep(-10, -24, z) * ridge : 0);
    };
  }, [spec]);
  const color = useMemo(
    () =>
      makeTerrainColor({
        low: spec.low,
        high: spec.high,
        highAt: 4.5,
        shore: { color: spec.sand, waterY: 0, band: spec.shoreBand ?? 0.7 },
        underwater: spec.underwater,
        rockStrength: 0.3,
      }),
    [spec],
  );
  const trees = useMemo(
    () =>
      forestPlacements({
        count: spec.trees,
        seed: spec.seed,
        height,
        minY: spec.treeMinY ?? 0.6,
        sample: (r) => [(r() - 0.5) * 50, -24 + r() * 32],
      }),
    [spec, height],
  );
  const reeds = useMemo(
    () => (spec.reedBand ? { band: spec.reedBand, count: 2600 } : undefined),
    [spec],
  );
  return (
    <DioramaCanvas poses={spec.poses} sky={spec.sky} {...scene}>
      <Heightfield spec={FIELD} height={height} color={color} />
      <WaterSheet
        position={[0, 0.01, -4]}
        size={[70, 52]}
        color={spec.water}
        opacity={spec.opacity ?? 0.82}
        normalScale={0.25}
        repeat={9}
        flow={[0.01, 0.02]}
      />
      <ShoreFoam height={height} center={[0, -4]} extent={[56, 40]} level={0} size={256} />
      <Forest placements={trees} tones={['#2a5a2c', '#386e33', '#4b7438']} />
      <Meadow
        height={height}
        area={COVER_AREA}
        tone={spec.coverTone ?? 'coast'}
        minY={0.4}
        reeds={reeds}
        seed={spec.seed + 500}
      />
      {spec.extras?.(height)}
    </DioramaCanvas>
  );
}

/** Chọn n điểm nằm ở vùng nước (độ cao < maxY) để đặt thuyền. */
function waterSpots(
  height: HeightFn,
  n: number,
  seed: number,
  maxY: number,
): Array<[number, number]> {
  const random = seeded(seed);
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 400 && out.length < n; i++) {
    const x = (random() - 0.5) * 30;
    const z = -8 + random() * 16;
    if (height(x, z) < maxY) out.push([x, z]);
  }
  return out;
}

/** Chọn n điểm trên bờ (độ cao trong [minY, maxY]) để đặt cọ, nhà… */
function shoreSpots(
  height: HeightFn,
  n: number,
  seed: number,
  minY: number,
  maxY: number,
): Array<[number, number, number]> {
  const random = seeded(seed);
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < 800 && out.length < n; i++) {
    const x = (random() - 0.5) * 36;
    const z = -10 + random() * 18;
    const h = height(x, z);
    if (h > minY && h < maxY) out.push([x, z, h]);
  }
  return out;
}

const WIDE_POSES: CameraPoses = {
  overview: { position: [0, 3.4, 11], target: [0, 0.4, -3] },
  close: { position: [2, 1.4, 6], target: [0, 0.3, -2] },
  high: { position: [3, 7, 4], target: [0, 0.2, -4] },
};

/* ----------------------------- Hồ Lắk (photo) ---------------------------- */
const HO_LAK: ShoreSceneSpec = {
  inland: (x, z) => (Math.hypot(x / 12, (z + 3) / 7) - 1) * 5,
  slopeLen: 6,
  inlandHeight: 1.4,
  seaDepth: 0.4,
  relief: 0.5,
  ridge: 5.5,
  water: '#8a7d58',
  opacity: 0.9,
  sand: '#b8a878',
  underwater: '#8a7d58',
  low: '#6f8f44',
  high: '#4a6d36',
  frontLow: 4,
  coverTone: 'lush',
  reedBand: [-0.14, 0.05],
  trees: 150,
  seed: 301,
  poses: {
    overview: { position: [0, 4.2, 13], target: [0, 0.2, -3] },
    close: { position: [2, 1.6, 7.5], target: [0, 0.2, -2] },
    high: { position: [3, 9, 6], target: [0, 0.1, -4] },
  },
  sky: LAKE_SKY,
  extras: (height) => (
    <>
      <Elephant position={[-2.2, -0.25, -0.5]} rotationY={0.4} scale={0.85} />
      <Elephant position={[1.4, -0.25, -2.4]} rotationY={-0.6} scale={0.85} />
      {Array.from({ length: 16 }).map((_, i) => (
        <Cylinder
          key={i}
          position={[-8 + i * 0.35, 0.3, 2.2 + Math.sin(i * 0.5) * 0.2]}
          radius={0.02}
          height={0.7}
          color="#a58f5a"
          segments={4}
        />
      ))}
      {shoreSpots(height, 1, 5, 0.45, 1.1).map(([x, z, h]) => (
        <StiltLonghouse key={`${x}${z}`} position={[x, h, z]} rotationY={0.6} length={2.6} />
      ))}
    </>
  ),
};
export function HoLakScene(props: DioramaSceneProps) {
  return <ShoreScene spec={HO_LAK} {...props} />;
}

/* --------------------------- Đầm Ô Loan (photo) -------------------------- */
const DAM_O_LOAN: ShoreSceneSpec = {
  inland: (x, z) => (Math.hypot(x / 10, (z + 3) / 5) - 1) * 5,
  slopeLen: 5,
  inlandHeight: 2.2,
  seaDepth: 0.5,
  relief: 0.4,
  ridge: 3.5,
  water: '#5b8f94',
  opacity: 0.86,
  sand: '#d4c48e',
  underwater: '#a89a6a',
  low: '#8a9a4a',
  high: '#5f7a3a',
  frontLow: 3,
  coverTone: 'lush',
  reedBand: [-0.14, 0.05],
  trees: 90,
  seed: 311,
  poses: {
    overview: { position: [0, 3.8, 12], target: [0, 0.3, -4] },
    close: { position: [-2, 1.4, 7], target: [0, 0.3, -3] },
    high: { position: [3, 8, 5], target: [0, 0.2, -4] },
  },
  sky: { top: '#92aac0', mid: '#c2d0d8', bottom: '#dde6e8', fogFar: 60 },
  extras: (height) => (
    <>
      <group position={[-1.6, height(-1.6, 4.4), 4.4]}>
        <Box position={[0, 0.05, 0]} size={[1.6, 0.1, 1.1]} color="#d9d3c3" />
        <Box
          position={[0, 0.34, 0]}
          size={[1.2, 0.35, 0.22]}
          color="#b5463a"
          rotation={[0, 0, 0.05]}
        />
        <Box position={[-0.45, 0.8, 0]} size={[0.14, 0.9, 0.14]} color="#8a8f94" />
        <Box position={[0.45, 0.8, 0]} size={[0.14, 0.9, 0.14]} color="#8a8f94" />
      </group>
      {waterSpots(height, 7, 9, -0.2).map(([x, z], i) => (
        <Boat
          key={`${x}${z}`}
          position={[x, 0.02, z]}
          rotationY={i}
          color={i % 2 ? '#c0463a' : '#3a6fb0'}
        />
      ))}
    </>
  ),
};
export function DamOLoanScene(props: DioramaSceneProps) {
  return <ShoreScene spec={DAM_O_LOAN} {...props} />;
}

/* --------------------------- Vịnh Xuân Đài (photo) ----------------------- */
const XUAN_DAI: ShoreSceneSpec = {
  inland: (x, z) => -4.5 + 0.06 * x * x - z,
  slopeLen: 7,
  inlandHeight: 2.4,
  seaDepth: 0.9,
  relief: 0.5,
  ridge: 3.5,
  water: '#2f8fb0',
  sand: '#e0cfa2',
  underwater: '#bda878',
  low: '#5c8a3a',
  high: '#3d6a34',
  trees: 60,
  seed: 321,
  poses: WIDE_POSES,
  sky: SEA_SKY,
  extras: (height) => (
    <>
      {shoreSpots(height, 34, 17, 0.35, 1.5).map(([x, z, h], i) => (
        <Palm
          key={`${x}${z}`}
          position={[x, h, z]}
          height={1.2 + (i % 4) * 0.2}
          lean={((i % 5) - 2) * 0.05}
          seed={i}
        />
      ))}
      {waterSpots(height, 10, 19, -0.4).map(([x, z], i) => (
        <Boat
          key={`${x}${z}`}
          position={[x, 0.02, z]}
          rotationY={i * 0.7}
          color={i % 3 ? '#e8dfc8' : '#c0463a'}
        />
      ))}
    </>
  ),
};
export function XuanDaiScene(props: DioramaSceneProps) {
  return <ShoreScene spec={XUAN_DAI} {...props} />;
}

/* ------------------------------ Vũng Rô (photo) -------------------------- */
const VUNG_RO: ShoreSceneSpec = {
  inland: (x, z) => -3.5 + 0.1 * x * x - z,
  slopeLen: 5,
  inlandHeight: 4.6,
  seaDepth: 1.2,
  relief: 0.6,
  ridge: 6,
  water: '#2aa6b0',
  opacity: 0.8,
  sand: '#e6d6ae',
  underwater: '#b9a97c',
  low: '#6a8a3e',
  high: '#3d6a34',
  trees: 1100,
  seed: 331,
  poses: {
    overview: { position: [3, 4.6, 12], target: [0, 0.6, -3] },
    close: { position: [4, 1.8, 6], target: [0, 0.4, -2] },
    high: { position: [4, 9, 5], target: [0, 0.2, -4] },
  },
  sky: SEA_SKY,
  extras: (height) => (
    <>
      <Box position={[3.6, 0.12, 1.6]} size={[0.25, 0.1, 5]} color="#8a8f94" />
      {[-7.4, -6.6, -5.8].map((x) => (
        <Cylinder
          key={x}
          position={[x, height(x, -0.4) + 0.4, -0.4]}
          radius={0.4}
          height={0.8}
          color="#f1f1ee"
          segments={14}
        />
      ))}
      {waterSpots(height, 6, 23, -0.5).map(([x, z], i) => (
        <Boat
          key={`${x}${z}`}
          position={[x, 0.02, z]}
          rotationY={i}
          color={i % 2 ? '#c0463a' : '#3a6fb0'}
        />
      ))}
    </>
  ),
};
export function VungRoScene(props: DioramaSceneProps) {
  return <ShoreScene spec={VUNG_RO} {...props} />;
}

/* ---------------------------- Gành Đá Đĩa (photo) ------------------------ */
const GANH_DA_DIA: ShoreSceneSpec = {
  inland: (x, z) => -1.5 + 0.28 * x - z,
  slopeLen: 6,
  inlandHeight: 2.8,
  seaDepth: 1.0,
  relief: 0.5,
  water: '#2fb0b8',
  opacity: 0.8,
  sand: '#cdbb8c',
  underwater: '#b0a074',
  low: '#6d8a3e',
  high: '#4a7a34',
  trees: 40,
  seed: 341,
  poses: {
    overview: { position: [4, 2.6, 7.5], target: [0, 0.1, -2] },
    close: { position: [2.4, 1.2, 4], target: [0.4, 0.2, -1.2] },
    high: { position: [3, 6.5, 3], target: [0.4, 0.1, -2] },
  },
  sky: SEA_SKY,
  extras: (height) => {
    const rocks = scatterOnTerrain(14, 77, (r) => [-2 + r() * 8, -1 + r() * 6], height, [0.2, 0.5]);
    return (
      <>
        <BasaltColumns
          center={[0, -1.4]}
          radius={0.27}
          rows={16}
          cols={20}
          topY={0.38}
          heightAt={height}
          accept={(x, z) => {
            const d = GANH_DA_DIA.inland(x, z);
            return d > -0.7 && d < 2.4 && Math.abs(x) < 4.5;
          }}
        />
        <Instances
          placements={rocks}
          seed={9}
          color="#4a4d52"
          detail={2}
          amount={0.3}
          cuts={5}
          flat
        />
      </>
    );
  },
};
export function GanhDaDiaScene(props: DioramaSceneProps) {
  return <ShoreScene spec={GANH_DA_DIA} {...props} />;
}

/* -------------------------------- Mũi Điện (text) ------------------------ */
const MUI_DIEN: ShoreSceneSpec = {
  inland: (x, z) => -4 + 9 * Math.exp(-((x / 3.6) ** 2)) - z,
  slopeLen: 6,
  inlandHeight: 3.2,
  seaDepth: 1.4,
  relief: 0.8,
  ridge: 4,
  water: '#2a8ab0',
  sand: '#e0d0a2',
  underwater: '#b5a577',
  low: '#728a3e',
  high: '#4e7436',
  trees: 160,
  treeMinY: 0.35,
  shoreBand: 0.3,
  seed: 351,
  poses: {
    overview: { position: [4, 5, 12], target: [0, 0.5, 0] },
    close: { position: [2, 2, 8], target: [0, 0.4, 2] },
    high: { position: [3, 9, 6], target: [0, 0.2, -1] },
  },
  sky: SEA_SKY,
  extras: (height) => {
    const rocks = scatterOnTerrain(16, 91, (r) => [-3 + r() * 6, 1 + r() * 5], height, [0.2, 0.6]);
    return (
      <Instances
        placements={rocks}
        seed={11}
        color="#7d7a70"
        detail={2}
        amount={0.3}
        cuts={5}
        flat
      />
    );
  },
};
export function MuiDienScene(props: DioramaSceneProps) {
  return <ShoreScene spec={MUI_DIEN} {...props} />;
}
