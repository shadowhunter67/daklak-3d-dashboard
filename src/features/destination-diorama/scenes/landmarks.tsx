import { useEffect, useMemo, type ReactNode } from 'react';
import { Meadow, type CoverTone } from '../dioramaCoverLayer';
import type { CameraPoses, DioramaSceneProps, SkySpec } from '../dioramaConfig';
import { createCliffBlockGeometry, fbm3, seeded } from '../dioramaGeometry';
import { DioramaCanvas, Forest, Heightfield, Instances, WaterSheet } from '../dioramaKit';
import { makeDemHeight, demPeak } from '../dioramaDem';
import { Box, Mast } from '../dioramaProps';
import { useShadows } from '../dioramaContext';
import {
  forestPlacements,
  makeTerrainColor,
  scatterOnTerrain,
  type HeightFn,
  type HeightfieldSpec,
  type PaletteSpec,
} from '../dioramaTerrain';

/**
 * Địa danh thiên nhiên đứng riêng trên nền địa hình: núi đơn độc (Chóp Chài), đỉnh có tảng đá bia
 * khổng lồ (Núi Đá Bia), cao nguyên thoải (Vân Hòa). Cả ba đều dựng theo mô tả văn bản của nguồn
 * (`text` trong `DIORAMA_BASIS`): hình dạng chỉ là gợi ý chung.
 */
const FIELD: HeightfieldSpec = {
  width: 64,
  depth: 48,
  segmentsX: 170,
  segmentsZ: 130,
  centerZ: -4,
};
const SKY: SkySpec = { top: '#6fa6d4', mid: '#b9d6e6', bottom: '#dbe8e6', fogFar: 62 };

const COVER_AREA = { x: [-24, 24] as [number, number], z: [-22, 10] as [number, number] };

interface LandmarkSpec {
  height: HeightFn;
  palette: PaletteSpec;
  trees: number;
  /** Chọn vị trí cây (x, z) từ số ngẫu nhiên. */
  treeSample: (random: () => number) => [number, number] | null;
  treeMinY: number;
  treeMaxY?: number;
  /** Lớp phủ cỏ: mật độ, tông màu, độ cao tối thiểu (mặc định 1 / lush / 0,3). */
  meadow?: { density?: number; tone?: CoverTone; minY?: number };
  seed: number;
  poses: CameraPoses;
  sky?: SkySpec;
  sea?: boolean;
  extras?: (height: HeightFn) => ReactNode;
}

function LandmarkScene({ spec, ...scene }: DioramaSceneProps & { spec: LandmarkSpec }) {
  const color = useMemo(() => makeTerrainColor(spec.palette), [spec]);
  const trees = useMemo(
    () =>
      forestPlacements({
        count: spec.trees,
        seed: spec.seed,
        height: spec.height,
        minY: spec.treeMinY,
        maxY: spec.treeMaxY,
        sample: spec.treeSample,
      }),
    [spec],
  );
  return (
    <DioramaCanvas poses={spec.poses} sky={spec.sky ?? SKY} {...scene}>
      <Heightfield spec={FIELD} height={spec.height} color={color} />
      {spec.sea && (
        <WaterSheet
          position={[0, 0.01, -4]}
          size={[70, 52]}
          color="#2a8ab0"
          opacity={0.82}
          normalScale={0.25}
          repeat={9}
          flow={[0.01, 0.02]}
        />
      )}
      <Forest placements={trees} tones={['#2a5a2c', '#386e33', '#4b7438']} />
      <Meadow
        height={spec.height}
        area={COVER_AREA}
        tone={spec.meadow?.tone ?? 'lush'}
        density={spec.meadow?.density ?? 1}
        minY={spec.meadow?.minY ?? 0.3}
        seed={spec.seed + 500}
      />
      {spec.extras?.(spec.height)}
    </DioramaCanvas>
  );
}

/* --------------------- Núi Chóp Chài: ngọn núi 394 m giữa đồng bằng ------------------- */
const chopChaiHeight: HeightFn = (x, z) => {
  const r2 = x * x + (z + 3) * (z + 3);
  const hill = 5.2 * Math.exp(-r2 / (2 * 3.3 * 3.3));
  const plain = 0.12 + (fbm3(x * 0.12, 0, z * 0.12, 3, 5) - 0.4) * 0.5;
  return hill * (0.85 + 0.3 * fbm3(x * 0.4, 0, z * 0.4, 3, 9)) + plain;
};
const CHOP_CHAI: LandmarkSpec = {
  height: chopChaiHeight,
  palette: { low: '#a9c25e', high: '#4d7a37', highAt: 4, rock: '#8a8478', rockStrength: 0.35 },
  trees: 130,
  treeMaxY: 3.6,
  treeSample: (r) => {
    const a = r() * Math.PI * 2;
    const d = 1.2 + r() ** 0.7 * 6;
    return [Math.cos(a) * d, -3 + Math.sin(a) * d];
  },
  treeMinY: 0.5,
  seed: 401,
  meadow: { minY: 0.04 },
  poses: {
    overview: { position: [0, 4.6, 14], target: [0, 1.6, -3] },
    close: { position: [3, 2.6, 7], target: [0, 2.4, -3] },
    high: { position: [4, 10, 2], target: [0, 1, -3] },
  },
  extras: (height) => <Mast position={[0, height(0, -3) - 0.05, -3]} height={1.5} />,
};
export function ChopChaiScene(props: DioramaSceneProps) {
  return <LandmarkScene spec={CHOP_CHAI} {...props} />;
}

/* ----------------- Núi Đá Bia: đỉnh có tảng đá bia khổng lồ ~80 m --------------------- */
const daBiaHeight: HeightFn = makeDemHeight('nui-da-bia');
const DA_BIA_PEAK = demPeak('nui-da-bia');
const DA_BIA_PEAK_X = DA_BIA_PEAK.x;
const DA_BIA_PEAK_Z = DA_BIA_PEAK.z;

function DaBiaSlab() {
  const shadows = useShadows();
  const geometry = useMemo(() => createCliffBlockGeometry(0.55, 3.2, 0.42, seeded(17)), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const y = daBiaHeight(DA_BIA_PEAK_X, DA_BIA_PEAK_Z);
  const slopeRocks = useMemo(
    () =>
      scatterOnTerrain(40, 433, (r) => [(r() - 0.5) * 22, -9 + r() * 8], daBiaHeight, [0.25, 0.7]),
    [],
  );
  return (
    <>
      <mesh
        geometry={geometry}
        position={[DA_BIA_PEAK_X, y + 0.95, DA_BIA_PEAK_Z]}
        rotation={[0, 0.5, 0.03]}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <meshStandardMaterial color="#9a958a" roughness={0.95} flatShading />
      </mesh>
      <Instances
        placements={slopeRocks}
        seed={9}
        color="#a29d92"
        detail={2}
        amount={0.3}
        cuts={5}
        flat
      />
      <Box position={[0, 0.02, 7.2]} size={[40, 0.05, 3.2]} color="#55565a" />
      <Box position={[0, 0.07, 7.2]} size={[40, 0.01, 0.08]} color="#d9d6c8" />
      <group position={[1.2, 0.35, 7.2]}>
        <Box position={[0, 0.15, 0]} size={[1.9, 0.5, 0.8]} color="#6b6258" />
        <Box position={[-1.1, 0.12, 0]} size={[0.55, 0.45, 0.78]} color="#d9dde0" />
        <Box position={[0, -0.12, 0]} size={[2.6, 0.08, 0.7]} color="#2a2a2a" />
      </group>
    </>
  );
}

const DA_BIA: LandmarkSpec = {
  height: daBiaHeight,
  palette: {
    low: '#5b8a40',
    high: '#3f6a34',
    highAt: 5,
    rock: '#8a8478',
    rockStrength: 0.5,
  },
  trees: 330,
  treeMaxY: 6.6,
  treeSample: (r) => [(r() - 0.5) * 34, -11 + r() * 8],
  treeMinY: 1.2,
  seed: 411,
  poses: {
    overview: { position: [5, 11, 19], target: [0, 5.5, -3] },
    close: { position: [3, 9, 11], target: [0, 7, -3] },
    high: { position: [5, 18, 3], target: [0, 4, -3] },
  },
  extras: () => <DaBiaSlab />,
};
export function DaBiaScene(props: DioramaSceneProps) {
  return <LandmarkScene spec={DA_BIA} {...props} />;
}

/* ------------------------ Cao nguyên Vân Hòa: ~400 m, thoải, mát ---------------------- */
const vanHoaHeight: HeightFn = makeDemHeight('cao-nguyen-van-hoa');
const VAN_HOA: LandmarkSpec = {
  height: vanHoaHeight,
  palette: { low: '#9bb35a', high: '#5d8a3e', highAt: 6, rockStrength: 0.2 },
  trees: 110,
  treeSample: (r) => [(r() - 0.5) * 50, -22 + r() * 30],
  treeMinY: 0.8,
  seed: 421,
  meadow: { density: 1.5, minY: 0.3 },
  sky: { top: '#7ab0d8', mid: '#c1dbe8', bottom: '#e3eeee', fogFar: 64 },
  poses: {
    overview: { position: [0, 12, 17], target: [0, 6.5, -4] },
    close: { position: [2, 9, 10], target: [0, 7, -3] },
    high: { position: [3, 20, 4], target: [0, 6.5, -5] },
  },
};
export function VanHoaScene(props: DioramaSceneProps) {
  return <LandmarkScene spec={VAN_HOA} {...props} />;
}
