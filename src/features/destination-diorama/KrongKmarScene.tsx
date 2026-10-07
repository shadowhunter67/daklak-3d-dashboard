import { useEffect, useMemo } from 'react';
import { CAMERA_PRESETS, type DioramaSceneProps } from './dioramaConfig';
import { useShadows } from './dioramaContext';
import { Meadow } from './dioramaCoverLayer';
import {
  createCliffBlockGeometry,
  scatterAlongPath,
  seeded,
  terrainHeight,
} from './dioramaGeometry';
import {
  DioramaCanvas,
  FallingWater,
  Forest,
  Heightfield,
  Instances,
  Mist,
  WaterSheet,
} from './dioramaKit';
import {
  forestPlacements,
  makeTerrainColor,
  type HeightfieldSpec,
  type PaletteSpec,
} from './dioramaTerrain';
import type { Placement } from './dioramaGeometry';

/**
 * Thác Krông Kmar — cảnh diorama đầu tiên, dựng theo ảnh Commons `File:Krongkma5.JPG` (CC BY-SA 3.0,
 * Đỗ Tuấn Hưng): khúc sông đầy tảng đá granit lớn, một đập thấp bắc ngang với dòng nước đổ nhỏ, vũng
 * nước phẳng phía thượng nguồn, đồi rừng hai bên. Vẫn là hình dựng minh hoạ, không phải mô hình đo đạc.
 */
const WEIR_Z = -2.2;
const WEIR_HEIGHT = 0.56;
const UPSTREAM_WATER_Y = 0.5;
const UPSTREAM_LENGTH = 4.4;

const FIELD: HeightfieldSpec = {
  width: 46,
  depth: 40,
  segmentsX: 150,
  segmentsZ: 130,
  centerZ: -6,
};
const PALETTE: PaletteSpec = {
  low: '#4c7739',
  high: '#2f5c2d',
  highAt: 5.5,
  rockStrength: 0.35,
  shore: { color: '#8a7a58', waterY: 0, band: 0.9 },
};
const COVER_AREA = { x: [-18, 18] as [number, number], z: [-20, 6] as [number, number] };
const REEDS = { band: [0.09, 0.5] as [number, number], count: 2200 };
const height = (x: number, z: number) => terrainHeight(x, z, WEIR_Z);

/** Đặt placement xuống đúng độ cao địa hình tại (x, z), giữ phần chôn sẵn trong `position[1]`. */
function onTerrain(placement: Placement): Placement {
  const [x, buried, z] = placement.position;
  return { ...placement, position: [x, height(x, z) + buried, z] };
}

/** Đập thấp bắc ngang sông + hai dòng nước đổ qua mép đập. */
function Weir() {
  const shadows = useShadows();
  const wall = useMemo(() => createCliffBlockGeometry(6.4, WEIR_HEIGHT, 0.4, seeded(21)), []);
  useEffect(() => () => wall.dispose(), [wall]);
  const falls = [
    { x: -0.5, width: 1.9, drop: WEIR_HEIGHT },
    { x: -2.6, width: 0.6, drop: WEIR_HEIGHT * 0.7 },
  ];
  const mistCenter = useMemo<[number, number, number]>(() => [-0.4, 0.1, WEIR_Z + 0.8], []);
  const mistSpread = useMemo<[number, number]>(() => [2.4, 0.9], []);
  return (
    <group>
      <mesh
        geometry={wall}
        position={[0, WEIR_HEIGHT / 2, WEIR_Z]}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <meshStandardMaterial color="#b4b0a5" roughness={0.95} />
      </mesh>
      {falls.map((fall) => (
        <FallingWater
          key={fall.x}
          position={[fall.x, fall.drop / 2, WEIR_Z + 0.26]}
          width={fall.width}
          height={fall.drop}
          seed={Math.round(fall.x * 10 + 30)}
        />
      ))}
      <Mist center={mistCenter} spread={mistSpread} />
    </group>
  );
}

/** Tảng đá granit tròn lớn trong lòng sông (hạ lưu) và dọc hai bờ vũng nước (thượng nguồn). */
function BoulderField() {
  const river = useMemo(
    () =>
      scatterAlongPath(
        [
          [0, WEIR_Z + 0.8],
          [0, 4.2],
        ],
        30,
        0.15,
        3.1,
        seeded(5),
      ).map((p) => onTerrain({ ...p, scale: [p.scale[0] * 2, p.scale[1] * 1.7, p.scale[2] * 2] })),
    [],
  );
  const upstreamBanks = useMemo(
    () =>
      scatterAlongPath(
        [
          [0, WEIR_Z - 0.6],
          [0, -6.4],
        ],
        14,
        2.7,
        0.8,
        seeded(11),
      ).map((p) =>
        onTerrain({ ...p, scale: [p.scale[0] * 2.1, p.scale[1] * 1.8, p.scale[2] * 2.1] }),
      ),
    [],
  );
  const pebbles = useMemo(
    () =>
      scatterAlongPath(
        [
          [0, WEIR_Z + 0.6],
          [0, 4.4],
        ],
        40,
        0.1,
        3.3,
        seeded(9),
      ).map((p) =>
        onTerrain({ ...p, scale: [p.scale[0] * 0.45, p.scale[1] * 0.45, p.scale[2] * 0.45] }),
      ),
    [],
  );
  return (
    <>
      <Instances placements={river} seed={3} color="#d4d0c4" cuts={5} flat />
      <Instances placements={upstreamBanks} seed={6} color="#dcd8cc" cuts={5} flat />
      <Instances placements={pebbles} seed={4} color="#c4bfb2" detail={1} cuts={3} flat />
    </>
  );
}

export function KrongKmarScene(props: DioramaSceneProps) {
  const color = useMemo(() => makeTerrainColor(PALETTE), []);
  const trees = useMemo(
    () =>
      forestPlacements({
        count: 300,
        seed: 33,
        height,
        minY: 0.3,
        sample: (r) => [(r() < 0.5 ? -1 : 1) * (5.2 + r() ** 0.8 * 13), -22 + r() * 23.5],
      }),
    [],
  );
  return (
    <DioramaCanvas poses={CAMERA_PRESETS} {...props}>
      <Heightfield spec={FIELD} height={height} color={color} />
      <Forest placements={trees} />
      <Meadow height={height} area={COVER_AREA} minY={0.3} reeds={REEDS} seed={560} />
      <WaterSheet position={[0, 0.07, 1.4]} size={[6.4, 7.2]} />
      <WaterSheet
        position={[0, UPSTREAM_WATER_Y, WEIR_Z - UPSTREAM_LENGTH / 2]}
        size={[6, UPSTREAM_LENGTH]}
        color="#33727f"
        opacity={0.92}
        normalScale={0.25}
      />
      <Weir />
      <BoulderField />
    </DioramaCanvas>
  );
}
