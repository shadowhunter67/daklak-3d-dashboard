import { useMemo, type ReactNode } from 'react';
import { Meadow } from '../dioramaCoverLayer';
import type { CameraPoses, DioramaSceneProps, SkySpec } from '../dioramaConfig';
import { smoothstep } from '../dioramaGeometry';
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
import { FootprintBuilding } from '../dioramaFootprint';
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
const WIDE_SKY: SkySpec = {
  top: '#6fa6d4',
  mid: '#b9d6e6',
  bottom: '#dbe8e6',
  fogNear: 40,
  fogFar: 140,
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
  /** Độ cao tối thiểu để trồng cây (mặc định -1); nâng lên để tránh lòng sông. */
  treeMinY?: number;
  tones?: [string, string, string];
  poses: CameraPoses;
  sky?: SkySpec;
  /** Cảnh rộng (công trình thật theo tỉ lệ) cho phép lùi camera xa hơn mặc định 18. */
  maxDistance?: number;
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
        minY: spec.treeMinY ?? -1,
        sample: (r) => {
          const a = r() * Math.PI * 2;
          const d = spec.clearRadius + r() ** 0.8 * 16;
          return [Math.cos(a) * d, Math.sin(a) * d - 1];
        },
      }),
    [spec, height],
  );
  return (
    <DioramaCanvas
      poses={spec.poses}
      sky={spec.sky ?? SKY}
      maxDistance={spec.maxDistance}
      {...scene}
    >
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
  // Ảnh: sân đất khô dưới tán cây, hai-ba con voi có yên gỗ và người quản tượng; nhà sàn ở phía sau.
  clearRadius: 9,
  trees: 120,
  treeSeed: 521,
  coverExclude: (x, z) => Math.abs(x) < 7 && z > -2 && z < 7,
  poses: {
    overview: { position: [3, 3.4, 11], target: [0, 1.0, 0] },
    close: { position: [2.4, 1.7, 5.4], target: [0, 1.1, 0.2] },
    high: { position: [3, 11, 4], target: [0, 0.5, -2] },
  },
  content: () => (
    <>
      <Box position={[0, 0.02, 2]} size={[15, 0.04, 9]} color="#b89e72" />
      <StiltLonghouse position={[-3.6, 0, -4.6]} rotationY={0.1} length={3.4} />
      <StiltLonghouse position={[2.4, 0, -5.2]} rotationY={-0.15} length={3.6} />
      <StiltLonghouse position={[7.4, 0, -1]} rotationY={1.5} length={3.2} />
      <Elephant position={[0.6, 0, 1.6]} rotationY={0.35} scale={1.15} rider />
      <Elephant position={[-2.2, 0, 1.2]} rotationY={0.15} scale={1.05} rider />
      <Elephant position={[3.2, 0, -0.4]} rotationY={-0.5} scale={0.85} />
      <BigTree position={[-6, 0, 1]} scale={1.3} />
      <BigTree position={[6.2, 0, 3]} scale={1.2} />
    </>
  ),
};
export function BuonDonScene(props: DioramaSceneProps) {
  return <StructureScene spec={BUON_DON} {...props} />;
}

/** Chòi mái tranh trên sàn cao ven ao (Akõ Dhông): bốn cột, sàn gỗ, mái chóp tranh xám nâu. */
function ThatchPavilion({
  position,
  rotationY = 0,
  size = 1.7,
}: {
  position: [number, number, number];
  rotationY?: number;
  size?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0.5, 0]} size={[size, 0.1, size]} color="#8a6a45" />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cylinder
            key={`${sx}${sz}`}
            position={[(sx * size) / 2.2, 0.55, (sz * size) / 2.2]}
            radius={0.05}
            height={1.1}
            color="#5a4228"
            segments={6}
          />
        )),
      )}
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 1]}>
        <coneGeometry args={[size * 0.95, 0.95, 4]} />
        <meshStandardMaterial color="#7a6a4a" roughness={1} flatShading />
      </mesh>
      <Box position={[0, 0.2, 0]} size={[size * 0.5, 0.4, size * 0.5]} color="#5a4228" />
    </group>
  );
}
const akoHeight: HeightFn = (x, z) => {
  const r = Math.hypot((x - 1.5) / 1.25, z + 1);
  return flatGround(x, z) * 0.35 - 0.55 * (1 - smoothstep(3.8, 5.2, r));
};
const AKO_DHONG: StructureSpec = {
  // Ảnh: ao nước đục xanh lục, vài chòi mái tranh trên sàn cao bên bờ, lối ván gỗ có cọc dẫn ra ao.
  height: akoHeight,
  clearRadius: 9,
  trees: 130,
  treeSeed: 531,
  coverExclude: (x, z) =>
    Math.hypot((x - 1.5) / 1.25, z + 1) < 5.2 || (Math.abs(x + 2) < 0.8 && z > -0.5 && z < 9),
  poses: {
    overview: { position: [-3, 4.6, 14], target: [2, 0.6, -1.5] },
    close: { position: [-1.6, 1.5, 8.6], target: [2, 0.8, -2] },
    high: { position: [3, 11, 4], target: [1.5, 0.3, -1] },
  },
  content: () => (
    <>
      <WaterSheet
        position={[1.5, 0.07, -1]}
        size={[13, 10]}
        shape="ellipse"
        color="#6d7a4f"
        opacity={0.9}
      />
      <group position={[-2, 0, 9]} rotation={[0, Math.PI / 2, 0]}>
        <WoodenBridge y={0.42} z={0} from={0} to={9} width={0.9} piers={8} />
      </group>
      <ThatchPavilion position={[6, 0, -2.4]} rotationY={0.3} size={2.1} />
      <ThatchPavilion position={[3.4, 0, -5.4]} rotationY={-0.2} size={1.8} />
      <ThatchPavilion position={[-1.2, 0, -5.2]} rotationY={0.5} size={1.7} />
      <ThatchPavilion position={[7.4, 0, 1.6]} rotationY={1.1} size={1.6} />
      <BigTree position={[8.6, 0, -4.4]} scale={1.2} />
      <BigTree position={[-5.6, 0, -2.4]} />
      <StiltLonghouse position={[-8, 0, 3]} rotationY={0.9} length={3.2} />
    </>
  ),
};
export function AkoDhongScene(props: DioramaSceneProps) {
  return <StructureScene spec={AKO_DHONG} {...props} />;
}

/* --------------------------------- Chùa Phổ Minh (photo) --------------------- */
/** Mái chùa hai tầng cong: hai chóp vuông chồng nhau, màu ngói đỏ nâu. */
function PagodaHall({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Box position={[0, 0.55, 0]} size={[3.6, 1.1, 1.8]} color="#d8b46a" />
      <Box position={[0, 1.35, 0]} size={[3.0, 0.5, 1.5]} color="#c99a52" />
      <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.55, 1, 0.8]}>
        <coneGeometry args={[1.35, 0.7, 4]} />
        <meshStandardMaterial color="#9a4a2e" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 1.95, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.2, 1, 0.65]}>
        <coneGeometry args={[1.1, 0.7, 4]} />
        <meshStandardMaterial color="#8a3f2a" roughness={0.9} flatShading />
      </mesh>
      {[-1.2, 0, 1.2].map((x) => (
        <Box key={x} position={[x, 0.45, 0.92]} size={[0.5, 0.7, 0.05]} color="#7a3a22" />
      ))}
    </group>
  );
}
const PHO_MINH: StructureSpec = {
  // Ảnh: nhìn từ chân dãy bậc thang dài lên chính điện mái cong; hai bên lan can đá chạm phù điêu,
  // cột trụ có chóp nhỏ; cột cờ cao ở giữa; cây cổ thụ bên phải.
  clearRadius: 8,
  trees: 70,
  treeSeed: 601,
  coverExclude: (x, z) => Math.abs(x) < 4.4 && z > -9 && z < 8,
  poses: {
    overview: { position: [0.5, 1.6, 10], target: [0, 2.2, -5] },
    close: { position: [0, 1.2, 6], target: [0, 2.4, -4] },
    high: { position: [3, 12, 4], target: [0, 1, -4] },
  },
  content: () => (
    <>
      {Array.from({ length: 16 }, (_, s) => (
        <Box
          key={s}
          position={[0, 0.1 + s * 0.17, 6 - s * 0.7]}
          size={[3.4, 0.17, 0.72]}
          color="#8f8a80"
        />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box position={[side * 2.05, 1.5, -0.3]} size={[0.5, 3.0, 11.6]} color="#b98e5a" />
          <Box position={[side * 2.05, 3.05, -0.3]} size={[0.62, 0.12, 11.7]} color="#d8c9a6" />
          {[5, 1.6, -2, -5.4].map((z) => (
            <Box key={z} position={[side * 2.05, 3.3, z]} size={[0.5, 0.45, 0.5]} color="#cdbf9e" />
          ))}
          <Box position={[side * 1.78, 1.5, -0.3]} size={[0.06, 2.2, 8.2]} color="#c9bc9a" />
        </group>
      ))}
      <Box position={[0, 2.9, -6.2]} size={[5.4, 0.3, 3.0]} color="#8f8a80" />
      <Cylinder position={[0, 4.4, -4.6]} radius={0.035} height={5.2} color="#e8e8e0" />
      <PagodaHall position={[0, 3.05, -7.2]} />
      <BigTree position={[5.2, 0, -2]} scale={2.1} />
      <BigTree position={[-6, 0, -5]} scale={1.4} />
    </>
  ),
};
export function PhoMinhScene(props: DioramaSceneProps) {
  return <StructureScene spec={PHO_MINH} {...props} />;
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
  // Mặt bằng THẬT từ OpenStreetMap (hình chữ H ~119 × 60 m, 2 tầng), 1 đơn vị = 5 m; xem dioramaRealScale.ts.
  clearRadius: 16,
  trees: 60,
  treeSeed: 551,
  coverExclude: (x, z) => Math.abs(x) < 13 && Math.abs(z) < 8.5,
  maxDistance: 40,
  sky: WIDE_SKY,
  poses: {
    overview: { position: [8, 14, 30], target: [0, 1, 0] },
    close: { position: [4, 5, 17], target: [0, 1.4, 0] },
    high: { position: [3, 38, 6], target: [0, 0, 0] },
  },
  content: () => (
    <>
      <FootprintBuilding
        site="bao-tang-dak-lak"
        metersPerUnit={5}
        heightMeters={7}
        color="#a87d4a"
      />
      <BigTree position={[-17, 0, 9]} scale={2.2} />
      <BigTree position={[18, 0, 7]} scale={2} />
    </>
  ),
};
export function BaoTangScene(props: DioramaSceneProps) {
  return <StructureScene spec={BAO_TANG} {...props} />;
}

/* ------------------------------- Nhà đày Buôn Ma Thuột (text) ---------------- */
/** Cửa gỗ xanh ngọc vòm bán nguyệt trên mặt tường: cánh cửa chữ nhật + vòm dẹt + khung vữa. */
function ArchedDoor({ x, y = 0.55, z }: { x: number; y?: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <Box position={[0, 0, 0]} size={[0.84, 1.1, 0.06]} color="#7fbfc8" />
      <Cylinder
        position={[0, 0.55, 0]}
        radius={0.42}
        height={0.06}
        color="#7fbfc8"
        segments={14}
        rotation={[Math.PI / 2, 0, 0]}
      />
      {[-0.46, 0.46].map((dx) => (
        <Box key={dx} position={[dx, 0.15, 0]} size={[0.1, 1.5, 0.08]} color="#e3c985" />
      ))}
    </group>
  );
}
function TiledRoof({
  position,
  width,
  depth,
  height = 0.8,
}: {
  position: [number, number, number];
  width: number;
  depth: number;
  height?: number;
}) {
  return (
    <mesh
      position={position}
      rotation={[0, Math.PI / 4, 0]}
      scale={[width / depth, 1, 1]}
      castShadow
    >
      <coneGeometry args={[depth * 0.78, height, 4]} />
      <meshStandardMaterial color="#6a362b" roughness={0.95} flatShading />
    </mesh>
  );
}
const NHA_DAY: StructureSpec = {
  // Ảnh: dãy nhà một tầng tường vàng ocher, mái ngói nâu sẫm, ba cửa vòm xanh ngọc nhìn ra sân lát.
  clearRadius: 10,
  trees: 60,
  treeSeed: 561,
  coverExclude: (x, z) => Math.abs(x) < 9 && z > -4 && z < 9,
  poses: {
    overview: { position: [2, 2.6, 12], target: [0, 1.0, -1] },
    close: { position: [1, 1.5, 7], target: [0, 1.0, -1.6] },
    high: { position: [3, 13, 4], target: [0, 0.3, 0] },
  },
  content: () => (
    <>
      <Box position={[0, 0.02, 3]} size={[22, 0.04, 12]} color="#cdb58b" />
      <Box position={[0, 0.8, -1.6]} size={[6.4, 1.6, 2.6]} color="#e3c27a" />
      {[-3.0, -1.5, 1.5, 3.0].map((x) => (
        <Box key={x} position={[x, 0.8, -0.27]} size={[0.28, 1.6, 0.1]} color="#efd9a0" />
      ))}
      <Box position={[0, 1.6, -0.3]} size={[6.5, 0.1, 0.18]} color="#efd9a0" />
      {[-2.2, 0, 2.2].map((x) => (
        <ArchedDoor key={x} x={x} z={-0.28} />
      ))}
      <TiledRoof position={[0, 2.0, -1.6]} width={6.8} depth={2.8} height={0.85} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box position={[side * 5.6, 0.7, -2.4]} size={[3.4, 1.4, 2.0]} color="#d9b774" />
          <TiledRoof position={[side * 5.6, 1.7, -2.4]} width={3.6} depth={2.3} height={0.7} />
          <Box position={[side * 5.6, 0.62, -1.35]} size={[0.5, 0.7, 0.06]} color="#4a3a2a" />
          <Box position={[side * 8.4, 0.9, 0.4]} size={[0.5, 1.8, 3.4]} color="#d9b774" />
        </group>
      ))}
      {/* Tường bao cao ~4 m dày 40 cm và tháp canh ở bốn góc (mô tả của nguồn; ảnh không thấy). */}
      {[
        [0, -7.4, 24, 0.3],
        [-12, 2, 0.3, 19],
        [12, 2, 0.3, 19],
      ].map(([x, z, w, dd]) => (
        <Box key={`w${x}${z}`} position={[x, 0.9, z]} size={[w, 1.8, dd]} color="#cbb58a" />
      ))}
      {[
        [-12, -7.4],
        [12, -7.4],
        [-12, 11.4],
        [12, 11.4],
      ].map(([x, z]) => (
        <group key={`t${x}${z}`} position={[x, 0, z]}>
          <Box position={[0, 1.3, 0]} size={[0.9, 2.6, 0.9]} color="#c9b284" />
          <Box position={[0, 2.8, 0]} size={[1.2, 0.4, 1.2]} color="#a89870" />
          <TiledRoof position={[0, 3.35, 0]} width={1.5} depth={1.5} height={0.6} />
        </group>
      ))}
      <BigTree position={[-3.2, 0, -5.6]} scale={1.4} />
      <BigTree position={[2.4, 0, -6.2]} scale={1.2} />
    </>
  ),
};
export function NhaDayScene(props: DioramaSceneProps) {
  return <StructureScene spec={NHA_DAY} {...props} />;
}

/* ------------------------------ Làng cà phê Trung Nguyên (photo) ------------- */
const LANG_CA_PHE: StructureSpec = {
  // Mặt bằng THẬT của Bảo tàng Thế giới Cà phê từ OpenStreetMap (~79 × 73 m), 1 đơn vị = 5 m.
  clearRadius: 14,
  trees: 70,
  treeSeed: 571,
  coverExclude: (x, z) => Math.abs(x) < 10 && Math.abs(z) < 9,
  maxDistance: 36,
  sky: WIDE_SKY,
  poses: {
    overview: { position: [6, 12, 26], target: [0, 1, 0] },
    close: { position: [4, 5, 14], target: [0, 1.2, 0] },
    high: { position: [3, 32, 5], target: [0, 0, 0] },
  },
  content: () => (
    <>
      <FootprintBuilding
        site="lang-ca-phe-trung-nguyen"
        metersPerUnit={5}
        heightMeters={7}
        color="#c4a574"
      />
      <BigTree position={[-14, 0, 6]} scale={1.8} />
      <BigTree position={[13, 0, -9]} scale={1.8} />
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
const bridgeHeight: HeightFn = (x, z) => {
  // Sông chạy đông-tây: lòng sông trũng quanh z = -4 rộng ~190 m (19 đơn vị), hai bờ là đất bằng.
  const bank = smoothstep(9, 13, Math.abs(z + 4));
  return flatGround(x, z) * 0.4 - 0.9 * (1 - bank);
};
const BRIDGE_PALETTE: PaletteSpec = {
  low: '#8aa04e',
  high: '#4f7d37',
  highAt: 3,
  rockStrength: 0.2,
  shore: { color: '#b8a47a', waterY: 0, band: 0.8 },
};
const CAU_ONG_COP: StructureSpec = {
  // Cầu gỗ THẬT dài ~422 m × rộng ~7 m (OpenStreetMap), 1 đơn vị = 10 m; chạy bắc-nam (trục z) qua sông.
  height: bridgeHeight,
  palette: BRIDGE_PALETTE,
  clearRadius: 4,
  trees: 120,
  treeSeed: 591,
  treeMinY: 0.02,
  coverExclude: (x, z) => Math.abs(z + 4) < 12 || Math.abs(x) < 1.5,
  coverReeds: BRIDGE_REEDS,
  maxDistance: 48,
  sky: WIDE_SKY,
  poses: {
    overview: { position: [18, 9, 26], target: [0, 0.4, -4] },
    close: { position: [4, 2.4, 8], target: [0, 0.4, -4] },
    high: { position: [3, 44, 2], target: [0, 0, -4] },
  },
  content: () => (
    <>
      <WaterSheet
        position={[0, -0.3, -4]}
        size={[64, 24]}
        color="#5a8f8a"
        opacity={0.88}
        flow={[0.01, 0.01]}
      />
      <group position={[0, 0, -4]} rotation={[0, Math.PI / 2, 0]}>
        <WoodenBridge y={0.3} z={0} from={-21} to={21} width={0.7} piers={42} />
      </group>
    </>
  ),
};
export function CauOngCopScene(props: DioramaSceneProps) {
  return <StructureScene spec={CAU_ONG_COP} {...props} />;
}
