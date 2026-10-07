import { useEffect, useMemo, type ReactNode } from 'react';
import { Meadow } from '../dioramaCoverLayer';
import type { CameraPoses, DioramaSceneProps, SkySpec } from '../dioramaConfig';
import { createBoulderGeometry, seeded, smoothstep } from '../dioramaGeometry';
import { DioramaCanvas, Forest, Heightfield, WaterSheet } from '../dioramaKit';
import {
  Blob,
  Box,
  ChamTower,
  Cylinder,
  Elephant,
  Statue,
  StiltLonghouse,
  TiledHall,
  WoodenBridge,
} from '../dioramaProps';
import { useShadows } from '../dioramaContext';
import {
  forestPlacements,
  makeTerrainColor,
  makeValleyHeight,
  type HeightFn,
  type HeightfieldSpec,
  type PaletteSpec,
} from '../dioramaTerrain';

/**
 * Công trình, di tích và làng bản: tháp Chăm, đình, bảo tàng, nhà đày, làng Ê Đê, tượng đài, cầu gỗ.
 * Mỗi cảnh ghép các khối trong `dioramaProps` lên nền địa hình phẳng; bố cục theo ảnh Commons đã
 * dẫn (`photo`) hoặc chỉ theo mô tả văn bản (`text`) — xem `DIORAMA_BASIS`.
 */
const FIELD: HeightfieldSpec = {
  width: 64,
  depth: 48,
  segmentsX: 150,
  segmentsZ: 120,
  centerZ: -4,
};
const SKY: SkySpec = { top: '#6fa6d4', mid: '#b9d6e6', bottom: '#dbe8e6', fogFar: 60 };
const GROUND: PaletteSpec = { low: '#8aa04e', high: '#4f7d37', highAt: 4, rockStrength: 0.2 };

const flatGround: HeightFn = makeValleyHeight({
  channelHalf: 14,
  sideHeight: 2.6,
  backHeight: 4,
  backStart: -12,
  relief: 1.6,
  steepness: 0.8,
});

const COVER_AREA = { x: [-16, 16] as [number, number], z: [-14, 12] as [number, number] };
const BRIDGE_REEDS = { band: [0.09, 0.5] as [number, number], count: 1800 };

interface StructureSpec {
  height?: HeightFn;
  palette?: PaletteSpec;
  /** Bán kính vùng quanh gốc toạ độ được để trống (không trồng cây). */
  clearRadius: number;
  /** Vị trí không phủ cỏ (sân lát, nền công trình, lối đi, lòng sông). */
  coverExclude?: (x: number, z: number) => boolean;
  /** Lau sậy ven nước (cầu Ông Cọp). */
  coverReeds?: { band: [number, number]; count?: number };
  trees: number;
  treeSeed: number;
  tones?: [string, string, string];
  poses: CameraPoses;
  sky?: SkySpec;
  content: (height: HeightFn) => ReactNode;
}

function StructureScene({ spec, ...scene }: DioramaSceneProps & { spec: StructureSpec }) {
  const height = spec.height ?? flatGround;
  const color = useMemo(() => makeTerrainColor(spec.palette ?? GROUND), [spec]);
  const trees = useMemo(
    () =>
      forestPlacements({
        count: spec.trees,
        seed: spec.treeSeed,
        height,
        minY: -1,
        sample: (r) => {
          const a = r() * Math.PI * 2;
          const d = spec.clearRadius + r() ** 0.8 * 16;
          return [Math.cos(a) * d, Math.sin(a) * d - 1];
        },
      }),
    [spec, height],
  );
  return (
    <DioramaCanvas poses={spec.poses} sky={spec.sky ?? SKY} {...scene}>
      <Heightfield spec={FIELD} height={height} color={color} />
      <Forest placements={trees} tones={spec.tones ?? ['#2a5a2c', '#386e33', '#4b7438']} />
      <Meadow
        height={height}
        area={COVER_AREA}
        minY={-1}
        exclude={spec.coverExclude}
        reeds={spec.coverReeds}
        seed={spec.treeSeed + 500}
      />
      {spec.content(height)}
    </DioramaCanvas>
  );
}

/** Tán cây cổ thụ lớn (đa/xoài…): thân to + cụm tán nhiều khối. */
function BigTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Cylinder
        position={[0, 0.9, 0]}
        radius={0.22}
        radiusTop={0.14}
        height={1.8}
        color="#6a5238"
      />
      <Blob position={[0, 2.2, 0]} scale={[1.3, 0.8, 1.3]} color="#2f6a2c" />
      <Blob position={[0.8, 1.9, 0.2]} scale={[0.9, 0.6, 0.9]} color="#386e33" />
      <Blob position={[-0.8, 1.9, -0.2]} scale={[0.9, 0.6, 0.9]} color="#356b30" />
      <Blob position={[0.1, 2.7, -0.3]} scale={[0.8, 0.5, 0.8]} color="#3f7a35" />
    </group>
  );
}

/* ------------------------------ Tháp Nhạn (photo) ----------------------------- */
const nhanHeight: HeightFn = (x, z) => {
  const r = Math.hypot(x, z);
  return 0.1 + 2.2 * (1 - smoothstep(3.4, 11, r)) + (flatGround(x, z) - 0.05) * 0.4;
};
const THAP_NHAN: StructureSpec = {
  height: nhanHeight,
  clearRadius: 4.2,
  trees: 120,
  treeSeed: 501,
  coverExclude: (x, z) => Math.hypot(x, z) < 5.4,
  poses: {
    overview: { position: [5, 5.6, 11], target: [0, 4, 0] },
    close: { position: [2.6, 3.8, 5.4], target: [0, 4.4, 0] },
    high: { position: [4, 12, 4], target: [0, 2, 0] },
  },
  content: () => (
    <>
      <Box position={[0, 2.32, 0]} size={[6.8, 0.06, 6.8]} color="#c46a3a" />
      {[
        [0, -3.4, 6.8, 0.3],
        [0, 3.4, 6.8, 0.3],
        [-3.4, 0, 0.3, 6.8],
        [3.4, 0, 0.3, 6.8],
      ].map(([x, z, w, d]) => (
        <Box key={`${x}${z}`} position={[x, 2.55, z]} size={[w, 0.5, d]} color="#a8552c" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <Box
          key={s}
          position={[0, 2.2 - s * 0.32, 3.9 + s * 0.45]}
          size={[1.6, 0.3, 0.45]}
          color="#b5602f"
        />
      ))}
      <ChamTower position={[0, 2.35, 0]} tiers={4} baseWidth={1.55} height={4.8} />
    </>
  ),
};
export function ThapNhanScene(props: DioramaSceneProps) {
  return <StructureScene spec={THAP_NHAN} {...props} />;
}

/* ---------------------------- Tháp Yang Prong (photo) -------------------------- */
const YANG_PRONG: StructureSpec = {
  clearRadius: 6.5,
  trees: 220,
  treeSeed: 511,
  coverExclude: (x, z) => Math.hypot(x, z) < 2.6,
  tones: ['#1f4d26', '#2c6030', '#3a6b34'],
  poses: {
    overview: { position: [4, 4.6, 11], target: [0, 1.6, 0] },
    close: { position: [2, 1.8, 4], target: [0, 1.4, 0] },
    high: { position: [3, 9, 3], target: [0, 0.8, 0] },
  },
  content: () => (
    <>
      <Box position={[0, 0.1, 0]} size={[3.2, 0.2, 3.2]} color="#7a4a2a" />
      <ChamTower
        position={[0, 0.15, 0]}
        tiers={3}
        baseWidth={1.3}
        height={2.8}
        brick="#a8693a"
        ruin={0.7}
      />
      <Blob position={[0, 3.0, 0]} scale={[0.85, 0.5, 0.85]} color="#3f7a35" />
      <Blob position={[0.55, 2.0, 0.5]} scale={[0.4, 0.5, 0.3]} color="#3a7032" />
      <Blob position={[-0.5, 1.5, 0.45]} scale={[0.35, 0.6, 0.3]} color="#356b30" />
      {[
        [1.8, 0.8],
        [-1.9, -0.5],
        [1.2, -1.7],
      ].map(([x, z]) => (
        <Box
          key={`${x}${z}`}
          position={[x, 0.14, z]}
          size={[0.55, 0.28, 0.45]}
          color="#8c5a32"
          rotation={[0, x, 0]}
        />
      ))}
    </>
  ),
};
export function ThapYangProngScene(props: DioramaSceneProps) {
  return <StructureScene spec={YANG_PRONG} {...props} />;
}

/* --------------------------- Buôn Đôn & Buôn Akõ Dhông (text) --------------------- */
const BUON_DON: StructureSpec = {
  clearRadius: 9,
  trees: 120,
  treeSeed: 521,
  poses: {
    overview: { position: [5, 6, 17], target: [0, 0.8, -1] },
    close: { position: [2, 1.8, 6], target: [0, 0.9, -1] },
    high: { position: [3, 11, 4], target: [0, 0.5, -2] },
  },
  content: () => (
    <>
      <StiltLonghouse position={[-3.2, 0, -2.4]} rotationY={0.1} length={3.4} />
      <StiltLonghouse position={[1.4, 0, -3.4]} rotationY={-0.15} length={3.6} />
      <StiltLonghouse position={[3.8, 0, 0.2]} rotationY={1.5} length={3.2} />
      <StiltLonghouse position={[-4.2, 0, 2]} rotationY={1.4} length={3.0} />
      <StiltLonghouse position={[-0.6, 0, 2.2]} rotationY={0.05} length={3.4} />
      <Elephant position={[0.8, 0, -0.2]} rotationY={0.5} />
      <Elephant position={[-2.4, 0, 0.4]} rotationY={-0.7} scale={0.8} />
      <BigTree position={[6.4, 0, 2.4]} scale={1.2} />
    </>
  ),
};
export function BuonDonScene(props: DioramaSceneProps) {
  return <StructureScene spec={BUON_DON} {...props} />;
}

const AKO_DHONG: StructureSpec = {
  clearRadius: 9,
  trees: 120,
  treeSeed: 531,
  coverExclude: (_x, z) => Math.abs(z - 1.6) < 0.9,
  poses: {
    overview: { position: [4, 6, 17], target: [0, 0.8, 1] },
    close: { position: [1.4, 1.6, 6.4], target: [0, 0.9, -1] },
    high: { position: [3, 11, 4], target: [0, 0.5, -2] },
  },
  content: () => (
    <>
      <Box position={[0, 0.02, 1.6]} size={[16, 0.03, 1.4]} color="#b79d6a" />
      {[-5.4, -1.8, 1.8, 5.4].map((x, i) => (
        <StiltLonghouse
          key={`a${x}`}
          position={[x, 0, -0.6]}
          rotationY={Math.PI + 0.03 * i}
          length={3.2}
        />
      ))}
      {[-5.4, -1.8, 1.8, 5.4].map((x, i) => (
        <StiltLonghouse key={`b${x}`} position={[x, 0, 3.8]} rotationY={0.04 * i} length={3.2} />
      ))}
      <BigTree position={[0, 0, -3.6]} scale={1.3} />
      <BigTree position={[-3.6, 0, 6.4]} />
    </>
  ),
};
export function AkoDhongScene(props: DioramaSceneProps) {
  return <StructureScene spec={AKO_DHONG} {...props} />;
}

/* ------------------------------ Đình Lạc Giao (photo) ------------------------ */
const DINH_LAC_GIAO: StructureSpec = {
  clearRadius: 7,
  trees: 70,
  treeSeed: 541,
  coverExclude: (x, z) => Math.abs(x) < 4.8 && z > -2.6 && z < 5.6,
  poses: {
    overview: { position: [3, 4.6, 13], target: [0, 1, 0] },
    close: { position: [1.4, 1.4, 5.6], target: [0, 1.1, 0] },
    high: { position: [3, 11, 3], target: [0, 0.4, 0] },
  },
  content: () => (
    <>
      <Box position={[0, 0.02, 2.2]} size={[9, 0.04, 6]} color="#b9794f" />
      <TiledHall position={[0, 0, -1]} width={3.8} depth={2.2} />
      <TiledHall position={[-4.4, 0, -0.6]} width={2.2} depth={1.5} />
      <TiledHall position={[4.4, 0, -0.6]} width={2.2} depth={1.5} />
      <BigTree position={[-5.2, 0, 3]} scale={1.1} />
      <Box position={[0, 0.3, 5.4]} size={[9, 0.6, 0.2]} color="#e7dcc3" />
    </>
  ),
};
export function DinhLacGiaoScene(props: DioramaSceneProps) {
  return <StructureScene spec={DINH_LAC_GIAO} {...props} />;
}

/* ------------------------------- Bảo tàng Đắk Lắk (photo) -------------------- */
const BAO_TANG: StructureSpec = {
  clearRadius: 8,
  trees: 40,
  treeSeed: 551,
  coverExclude: (x, z) => z > 3.6 && Math.abs(x) < 9.2,
  poses: {
    overview: { position: [3, 3.6, 11], target: [0, 1.2, -1] },
    close: { position: [1.6, 1.4, 6.2], target: [0, 1.3, 0] },
    high: { position: [3, 11, 3], target: [0, 0.5, -1] },
  },
  content: () => (
    <>
      <Box position={[0, 0.02, 5.4]} size={[18, 0.03, 3.2]} color="#7d8085" />
      {[-1.5, 1.5].map((x) => (
        <Box key={x} position={[x, 0.7, 3.4]} size={[0.3, 1.4, 0.3]} color="#c9a227" />
      ))}
      <Box position={[0, 1.55, 3.4]} size={[3.8, 0.22, 0.5]} color="#d9b43a" />
      <mesh position={[0, 2.1, 3.4]}>
        <coneGeometry args={[0.3, 0.9, 4]} />
        <meshStandardMaterial color="#c9a227" roughness={0.8} />
      </mesh>
      <StiltLonghouse
        position={[0, 0.3, -0.6]}
        length={6}
        width={2}
        floorY={0.4}
        roofColor="#a8723a"
        wallColor="#c9a672"
      />
      <BigTree position={[-5, 0, 2]} scale={1.5} />
      <BigTree position={[5.4, 0, 1.4]} scale={1.4} />
      <BigTree position={[-6, 0, -2]} scale={1.2} />
    </>
  ),
};
export function BaoTangScene(props: DioramaSceneProps) {
  return <StructureScene spec={BAO_TANG} {...props} />;
}

/* ------------------------------- Nhà đày Buôn Ma Thuột (text) ---------------- */
const NHA_DAY: StructureSpec = {
  clearRadius: 10,
  trees: 60,
  treeSeed: 561,
  coverExclude: (x, z) => Math.abs(x) < 4.6 && Math.abs(z) < 3.6,
  poses: {
    overview: { position: [5, 5.4, 12], target: [0, 0.8, 0] },
    close: { position: [3, 2.6, 7], target: [0, 0.9, 0] },
    high: { position: [3, 13, 4], target: [0, 0.3, 0] },
  },
  content: () => (
    <>
      <Box position={[0, 0.02, 0]} size={[8.6, 0.03, 6.6]} color="#a39574" />
      {[
        [0, -3.3, 8.6, 0.25],
        [0, 3.3, 8.6, 0.25],
        [-4.3, 0, 0.25, 6.6],
        [4.3, 0, 0.25, 6.6],
      ].map(([x, z, w, d]) => (
        <Box key={`${x}${z}`} position={[x, 0.7, z]} size={[w, 1.4, d]} color="#bfae8a" />
      ))}
      <Box position={[0, 0.7, 3.3]} size={[1.6, 1.4, 0.3]} color="#6a4a2a" />
      {[
        [-3.9, -2.9],
        [3.9, -2.9],
        [-3.9, 2.9],
        [3.9, 2.9],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <Box position={[0, 1.2, 0]} size={[0.7, 2.4, 0.7]} color="#a89870" />
          <mesh position={[0, 2.75, 0]}>
            <coneGeometry args={[0.7, 0.7, 4]} />
            <meshStandardMaterial color="#8a3f2a" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {[-1.6, 0, 1.6].map((z) => (
        <Box key={z} position={[-0.6, 0.35, z - 0.3]} size={[5.2, 0.7, 0.9]} color="#d8cdb0" />
      ))}
      {[-1.6, 0, 1.6].map((z) => (
        <Box
          key={`r${z}`}
          position={[-0.6, 0.85, z - 0.3]}
          size={[5.5, 0.12, 1.1]}
          color="#8a3f2a"
        />
      ))}
    </>
  ),
};
export function NhaDayScene(props: DioramaSceneProps) {
  return <StructureScene spec={NHA_DAY} {...props} />;
}

/* ------------------------------ Làng cà phê Trung Nguyên (photo) ------------- */
function SignBoulder() {
  const shadows = useShadows();
  const geometry = useMemo(() => createBoulderGeometry(3, 0.18, seeded(8), 3), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={[-2.6, 0.18, 2.4]}>
      <Box position={[0, 0, 0]} size={[3.2, 0.36, 1.4]} color="#e6dcc3" />
      <mesh
        geometry={geometry}
        position={[0, 0.18, 0]}
        scale={[2.6, 1.4, 0.9]}
        rotation={[0, 0.15, 0]}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <meshStandardMaterial color="#a38b66" roughness={0.9} flatShading />
      </mesh>
      <Box position={[0, 0.85, 0.46]} size={[1.9, 0.4, 0.04]} color="#6e4f2e" />
    </group>
  );
}
const LANG_CA_PHE: StructureSpec = {
  clearRadius: 8,
  trees: 70,
  treeSeed: 571,
  coverExclude: (x, z) => Math.abs(x) < 6.2 && z > -1.2 && z < 5.2,
  poses: {
    overview: { position: [3, 3.6, 11], target: [0, 0.9, 0] },
    close: { position: [-1, 1.4, 6.4], target: [-2.4, 0.9, 2.4] },
    high: { position: [3, 11, 4], target: [0, 0.3, 0] },
  },
  content: () => (
    <>
      <Box position={[0, 0.02, 2]} size={[12, 0.04, 6]} color="#b8844a" />
      <SignBoulder />
      <StiltLonghouse position={[2.6, 0, -1.4]} rotationY={0.2} length={3.6} width={1.4} />
      <StiltLonghouse position={[-1.4, 0, -2.6]} rotationY={-0.1} length={3.2} width={1.3} />
      <StiltLonghouse position={[5.2, 0, 1.6]} rotationY={1.45} length={3.0} width={1.3} />
      <BigTree position={[-5.4, 0, 0.4]} scale={1.1} />
    </>
  ),
};
export function LangCaPheScene(props: DioramaSceneProps) {
  return <StructureScene spec={LANG_CA_PHE} {...props} />;
}

/* ----------------------------- Đức Mẹ Giang Sơn (photo) ---------------------- */
const giangSonHeight: HeightFn = (x, z) => {
  const r = Math.hypot(x, z + 1);
  return 0.1 + 2.6 * (1 - smoothstep(2.6, 10, r)) + (flatGround(x, z) - 0.05) * 0.4;
};
const GIANG_SON: StructureSpec = {
  height: giangSonHeight,
  clearRadius: 4,
  trees: 130,
  treeSeed: 581,
  coverExclude: (x, z) => Math.hypot(x, z + 1) < 2.4 || (Math.abs(x) < 1.5 && z > 0 && z < 7),
  poses: {
    overview: { position: [3, 5, 11], target: [0, 3.4, -1] },
    close: { position: [1.4, 3.6, 5], target: [0, 4.2, -1] },
    high: { position: [3, 12, 3], target: [0, 2, -1] },
  },
  content: () => (
    <>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
        <Box
          key={s}
          position={[0, 2.2 - s * 0.3, 2.4 + s * 0.5]}
          size={[2.2, 0.28, 0.5]}
          color="#e8e2d2"
        />
      ))}
      <Statue position={[0, 2.7, -1]} scale={1.15} />
    </>
  ),
};
export function GiangSonScene(props: DioramaSceneProps) {
  return <StructureScene spec={GIANG_SON} {...props} />;
}

/* -------------------------------- Cầu Ông Cọp (text) ------------------------- */
const bridgeHeight: HeightFn = makeValleyHeight({
  channelHalf: 3.2,
  sideHeight: 2,
  backHeight: 5,
  backStart: -12,
  relief: 1.5,
  steepness: 1.3,
});
const BRIDGE_PALETTE: PaletteSpec = {
  low: '#8aa04e',
  high: '#4f7d37',
  highAt: 3,
  rockStrength: 0.2,
  shore: { color: '#b8a47a', waterY: 0, band: 0.8 },
};
const CAU_ONG_COP: StructureSpec = {
  height: bridgeHeight,
  palette: BRIDGE_PALETTE,
  clearRadius: 7,
  trees: 120,
  treeSeed: 591,
  coverExclude: (x) => Math.abs(x) < 3.5,
  coverReeds: BRIDGE_REEDS,
  poses: {
    overview: { position: [0, 3, 11], target: [0, 0.8, -1] },
    close: { position: [-1, 1.2, 5], target: [0, 0.8, -1] },
    high: { position: [4, 10, 4], target: [0, 0.3, -2] },
  },
  content: () => (
    <>
      <WaterSheet
        position={[0, 0.07, -2]}
        size={[6.4, 30]}
        color="#5a8f8a"
        opacity={0.85}
        flow={[0.01, 0.03]}
      />
      <WoodenBridge y={0.85} z={-0.5} from={-5.6} to={5.6} />
    </>
  ),
};
export function CauOngCopScene(props: DioramaSceneProps) {
  return <StructureScene spec={CAU_ONG_COP} {...props} />;
}
