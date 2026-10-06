import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { subscribeWebGLContext } from '../../components/map/webglLifecycle';
import { getGraphicsQualityConfigForCurrentDevice } from '../../utils/graphicsQuality';
import {
  createBoulderGeometry,
  createCliffBlockGeometry,
  createStreakTextureData,
  createTerrainGeometry,
  createWaterNormalData,
  scatterAlongPath,
  seeded,
  terrainHeight,
  type Placement,
} from './dioramaGeometry';
import { CAMERA_PRESETS, type CameraPose, type CameraPresetId } from './dioramaConfig';

/**
 * Bố cục dựa trên ảnh thật (Wikimedia Commons File:Krongkma5.JPG, CC BY-SA 3.0, Đỗ Tuấn Hưng): khúc
 * sông đầy tảng đá granit lớn, một đập thấp bắc ngang với dòng nước đổ nhỏ, vũng nước phẳng phía
 * thượng nguồn, đồi rừng hai bên. Đây vẫn là hình dựng minh hoạ, không phải mô hình đo đạc.
 */
const WEIR_Z = -2.2;
const WEIR_HEIGHT = 0.56;
const UPSTREAM_WATER_Y = 0.5;
const UPSTREAM_LENGTH = 4.4;

function useMatrixSetter(placements: Placement[]) {
  return useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    return (mesh: THREE.InstancedMesh | null, base: string) => {
      if (!mesh) return;
      placements.forEach((placement, index) => {
        dummy.position.set(...placement.position);
        dummy.rotation.set(0, placement.rotationY, 0);
        dummy.scale.set(...placement.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        color.set(base).offsetHSL(0, 0, placement.hue);
        mesh.setColorAt(index, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
  }, [placements]);
}

/** Đặt placement xuống đúng độ cao địa hình tại (x, z), giữ phần chôn sẵn trong `position[1]`. */
function onTerrain(placement: Placement): Placement {
  const [x, buried, z] = placement.position;
  return { ...placement, position: [x, terrainHeight(x, z, WEIR_Z) + buried, z] };
}

function Instances({
  placements,
  seed,
  color,
  shadows,
  detail = 2,
  amount = 0.3,
  roughness = 0.9,
  cuts = 0,
  flat = false,
}: {
  placements: Placement[];
  seed: number;
  color: string;
  shadows: boolean;
  detail?: number;
  amount?: number;
  roughness?: number;
  /** Số mặt cắt phẳng (đá granit vỡ) — 0 cho khối tròn. */
  cuts?: number;
  /** Tô bóng theo mặt (cạnh sắc) thay vì mượt. */
  flat?: boolean;
}) {
  const geometry = useMemo(
    () => createBoulderGeometry(detail, amount, seeded(seed), cuts),
    [detail, amount, seed, cuts],
  );
  const apply = useMatrixSetter(placements);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <instancedMesh
      ref={(mesh) => apply(mesh, color)}
      args={[geometry, undefined, placements.length]}
      castShadow={shadows}
      receiveShadow={shadows}
    >
      <meshStandardMaterial vertexColors roughness={roughness} flatShading={flat} />
    </instancedMesh>
  );
}

/** Địa hình heightfield: lòng sông phẳng, sườn đồi rừng hai bên, dãy núi phía sau. */
function Terrain({ shadows }: { shadows: boolean }) {
  const geometry = useMemo(() => createTerrainGeometry(46, 40, 150, 130, -6, WEIR_Z), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow={shadows}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

/** Mảng nhiễu mềm hình đốm (dùng cho bọt nước và sương). */
function useSoftSpot(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Bọt trắng ở chân dòng đổ + sương bốc lên nhẹ; sương đứng yên khi giảm chuyển động. */
function FallEffects({ reducedMotion }: { reducedMotion: boolean }) {
  const spot = useSoftSpot();
  const geometry = useMemo(() => {
    const random = seeded(4);
    const count = 60;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -1.6 + random() * 2.4;
      positions[i * 3 + 1] = 0.1 + random() * 0.8;
      positions[i * 3 + 2] = WEIR_Z + 0.35 + random() * 0.9;
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const points = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (reducedMotion) return;
    const attribute = points.current?.geometry.getAttribute('position') as
      THREE.BufferAttribute | undefined;
    if (!attribute) return;
    for (let i = 0; i < attribute.count; i++) {
      let y = attribute.getY(i) + delta * 0.1;
      if (y > 0.95) y = 0.1;
      attribute.setY(i, y);
    }
    attribute.needsUpdate = true;
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.55, 0.095, WEIR_Z + 0.75]}>
        <planeGeometry args={[2.8, 1.0]} />
        <meshBasicMaterial map={spot} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <points ref={points} geometry={geometry}>
        <pointsMaterial map={spot} size={0.55} transparent opacity={0.28} depthWrite={false} />
      </points>
    </>
  );
}

/** Đập thấp bắc ngang sông + hai dòng nước đổ qua mép đập (texture vệt bọt cuộn xuống). */
function Weir({ reducedMotion, shadows }: { reducedMotion: boolean; shadows: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const streaks = useMemo(() => {
    const data = createStreakTextureData(64, 128, seeded(7));
    const texture = new THREE.DataTexture(data, 64, 128, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);
  const wall = useMemo(() => createCliffBlockGeometry(6.4, WEIR_HEIGHT, 0.4, seeded(21)), []);
  useEffect(
    () => () => {
      streaks.dispose();
      wall.dispose();
    },
    [streaks, wall],
  );

  const flowMaterial = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, delta) => {
    const map = flowMaterial.current?.map;
    if (reducedMotion || !map) return;
    // Cả hai dòng đổ dùng chung một texture nên chỉ cần cuộn một lần.
    map.offset.y = (map.offset.y + delta * 0.55) % 1;
  });
  // Giảm chuyển động: vẽ đúng một khung tĩnh (frameloop="demand"); không cuộn nước.
  useEffect(() => {
    if (reducedMotion) invalidate();
  }, [reducedMotion, invalidate]);

  const falls = [
    { x: -0.5, width: 1.9, drop: WEIR_HEIGHT },
    { x: -2.6, width: 0.6, drop: WEIR_HEIGHT * 0.7 },
  ];
  return (
    <group>
      <mesh
        geometry={wall}
        position={[0, WEIR_HEIGHT / 2, WEIR_Z]}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <meshStandardMaterial color="#8d8a80" roughness={0.97} />
      </mesh>
      {falls.map((fall, index) => (
        <mesh
          key={fall.x}
          position={[fall.x, fall.drop / 2, WEIR_Z + 0.26]}
          rotation={[0.08, 0, 0]}
        >
          <planeGeometry args={[fall.width, fall.drop]} />
          <meshStandardMaterial
            ref={index === 0 ? flowMaterial : undefined}
            color="#b9dde6"
            map={streaks}
            transparent
            opacity={0.92}
            roughness={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}
      <FallEffects reducedMotion={reducedMotion} />
    </group>
  );
}

/** Lòng sông cạn hạ lưu + vũng nước phẳng cao hơn thượng nguồn; sóng gợn bằng normal map cuộn. */
function RiverWater({ reducedMotion, shadows }: { reducedMotion: boolean; shadows: boolean }) {
  const normal = useMemo(() => {
    const texture = new THREE.DataTexture(
      createWaterNormalData(128, seeded(13)),
      128,
      128,
      THREE.RGBAFormat,
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => normal.dispose(), [normal]);
  const flow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, delta) => {
    const map = flow.current?.normalMap;
    if (reducedMotion || !map) return;
    map.offset.x = (map.offset.x + delta * 0.02) % 1;
    map.offset.y = (map.offset.y + delta * 0.045) % 1;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 1.4]} receiveShadow={shadows}>
        <planeGeometry args={[6.4, 7.2]} />
        <meshStandardMaterial
          ref={flow}
          color="#3c7f8c"
          normalMap={normal}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.86}
          envMapIntensity={1.4}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, UPSTREAM_WATER_Y, WEIR_Z - UPSTREAM_LENGTH / 2]}
        receiveShadow={shadows}
      >
        <planeGeometry args={[6.0, UPSTREAM_LENGTH]} />
        <meshStandardMaterial
          color="#33727f"
          normalMap={normal}
          normalScale={new THREE.Vector2(0.25, 0.25)}
          roughness={0.04}
          metalness={0.1}
          transparent
          opacity={0.92}
          envMapIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

/** Tảng đá granit tròn lớn trong lòng sông (hạ lưu) và dọc hai bờ vũng nước (thượng nguồn). */
function BoulderField({ shadows }: { shadows: boolean }) {
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
      ).map((p) =>
        onTerrain({
          ...p,
          scale: [p.scale[0] * 2, p.scale[1] * 1.7, p.scale[2] * 2],
        }),
      ),
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
        onTerrain({
          ...p,
          scale: [p.scale[0] * 2.1, p.scale[1] * 1.8, p.scale[2] * 2.1],
        }),
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
        onTerrain({
          ...p,
          scale: [p.scale[0] * 0.45, p.scale[1] * 0.45, p.scale[2] * 0.45],
        }),
      ),
    [],
  );
  return (
    <>
      <Instances placements={river} seed={3} color="#8f8b80" shadows={shadows} cuts={5} flat />
      <Instances
        placements={upstreamBanks}
        seed={6}
        color="#98948a"
        shadows={shadows}
        cuts={5}
        flat
      />
      <Instances
        placements={pebbles}
        seed={4}
        color="#857f74"
        shadows={shadows}
        detail={1}
        cuts={3}
        flat
      />
    </>
  );
}

/** Rừng lá rộng nhiệt đới: thân cây + tán là cụm 3 khối tròn; bụi rậm ven bờ. */
function Forest({ shadows }: { shadows: boolean }) {
  const { crowns, trunks, shrubs } = useMemo(() => {
    const random = seeded(33);
    const groups: Placement[][] = [[], [], []];
    const trunkPlacements: Placement[] = [];
    for (let i = 0; i < 300; i++) {
      const side = random() < 0.5 ? -1 : 1;
      const x = side * (5.2 + random() ** 0.8 * 13);
      const z = -22 + random() * 23.5;
      const ground = terrainHeight(x, z, WEIR_Z);
      const trunkHeight = 0.7 + random() * 0.8;
      const width = 0.7 + random() * 0.7;
      trunkPlacements.push({
        position: [x, ground - 0.05, z],
        rotationY: 0,
        scale: [1, trunkHeight + 0.1, 1],
        hue: (random() - 0.5) * 0.06,
      });
      for (let k = 0; k < 5; k++) {
        const w = width * (0.5 + random() * 0.45);
        groups[(i + k) % 3].push({
          position: [
            x + (random() - 0.5) * width * 1.1,
            ground + trunkHeight - 0.15 + random() * 0.7,
            z + (random() - 0.5) * width * 1.1,
          ],
          rotationY: random() * Math.PI * 2,
          scale: [
            w * (0.9 + random() * 0.5),
            w * (0.5 + random() * 0.3),
            w * (0.9 + random() * 0.5),
          ],
          hue: (random() - 0.5) * 0.1,
        });
      }
    }
    const shrubPlacements = scatterAlongPath(
      [
        [0, -6],
        [0, 4.5],
      ],
      34,
      3.3,
      1.1,
      seeded(41),
    ).map((p) => {
      const s = 0.3 + p.scale[0] * 0.7;
      return onTerrain({
        ...p,
        position: [p.position[0], -0.05, p.position[2]],
        scale: [s, s * 0.7, s],
      });
    });
    return { crowns: groups, trunks: trunkPlacements, shrubs: shrubPlacements };
  }, []);
  const trunkGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.05, 0.09, 1, 6);
    geometry.translate(0, 0.5, 0);
    return geometry;
  }, []);
  const applyTrunks = useMatrixSetter(trunks);
  useEffect(() => () => trunkGeometry.dispose(), [trunkGeometry]);
  return (
    <>
      <instancedMesh
        ref={(mesh) => applyTrunks(mesh, '#6a5238')}
        args={[trunkGeometry, undefined, trunks.length]}
        castShadow={shadows}
      >
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <Instances
        placements={crowns[0]}
        seed={51}
        color="#27562a"
        shadows={shadows}
        detail={1}
        amount={0.5}
        roughness={1}
        flat
      />
      <Instances
        placements={crowns[1]}
        seed={52}
        color="#336a2f"
        shadows={shadows}
        detail={1}
        amount={0.5}
        roughness={1}
        flat
      />
      <Instances
        placements={crowns[2]}
        seed={53}
        color="#486f35"
        shadows={shadows}
        detail={1}
        amount={0.5}
        roughness={1}
        flat
      />
      <Instances
        placements={shrubs}
        seed={61}
        color="#3e6f33"
        shadows={shadows}
        detail={1}
        amount={0.5}
        roughness={1}
        flat
      />
    </>
  );
}

/** Bầu trời chuyển sắc + môi trường phản chiếu sinh tại chỗ (không tải HDR từ mạng, hợp CSP). */
function Atmosphere() {
  const gl = useThree((state) => state.gl);
  const environment = useMemo(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const texture = generator.fromScene(room, 0.04).texture;
    room.dispose();
    generator.dispose();
    return texture;
  }, [gl]);
  const sky = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, '#6fa6d4');
      gradient.addColorStop(0.55, '#b9d6e6');
      gradient.addColorStop(1, '#dbe8e6');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 4, 256);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  useEffect(
    () => () => {
      environment.dispose();
      sky.dispose();
    },
    [environment, sky],
  );
  return (
    <>
      <primitive object={environment} attach="environment" />
      <primitive object={sky} attach="background" />
    </>
  );
}

/** Camera chuyển cảnh mượt giữa các preset (đặt thẳng khi giảm chuyển động); OrbitControls vẫn dùng được. */
function CameraRig({ preset, reducedMotion }: { preset: CameraPresetId; reducedMotion: boolean }) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const goal = useRef<CameraPose>(CAMERA_PRESETS[preset]);

  useEffect(() => {
    goal.current = CAMERA_PRESETS[preset];
    if (reducedMotion) {
      camera.position.set(...goal.current.position);
      controls.current?.target.set(...goal.current.target);
      controls.current?.update();
      invalidate();
    }
  }, [preset, reducedMotion, camera, invalidate]);

  useFrame((_, delta) => {
    if (reducedMotion || !controls.current) return;
    const k = 1 - Math.exp(-delta * 3.5);
    camera.position.lerp(new THREE.Vector3(...goal.current.position), k);
    controls.current.target.lerp(new THREE.Vector3(...goal.current.target), k);
    controls.current.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={3}
      maxDistance={16}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.05}
      autoRotate={false}
    />
  );
}

/** Theo dõi mất/khôi phục WebGL context — dự án yêu cầu mọi Canvas giữ xử lý này. */
function ContextWatcher({ onLost, onRestored }: { onLost: () => void; onRestored: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(
    () => subscribeWebGLContext(gl.domElement, { onLost, onRestored }),
    [gl, onLost, onRestored],
  );
  return null;
}

export function KrongKmarScene({
  preset,
  reducedMotion,
  onContextLost,
  onContextRestored,
}: {
  preset: CameraPresetId;
  reducedMotion: boolean;
  onContextLost: () => void;
  onContextRestored: () => void;
}) {
  const quality = getGraphicsQualityConfigForCurrentDevice();
  // Bóng đổ chỉ bật trên máy đủ mạnh (cùng cờ với phần còn lại của dự án).
  const shadows = quality.contactShadows;
  const start = CAMERA_PRESETS.overview;
  return (
    <Canvas
      dpr={[1, quality.maxDevicePixelRatio]}
      gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}
      camera={{ position: start.position, fov: 42, near: 0.1, far: 80 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      shadows={shadows ? 'percentage' : false}
      scene={{ environmentIntensity: 0.4 }}
    >
      <Atmosphere />
      <fog attach="fog" args={['#d3e2e2', 14, 42]} />
      <hemisphereLight args={['#eaf4ff', '#4a5a38', 0.32]} />
      <directionalLight
        position={[9, 13, 7]}
        intensity={1.6}
        color="#fff0d0"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <Terrain shadows={shadows} />
      <Forest shadows={shadows} />
      <RiverWater reducedMotion={reducedMotion} shadows={shadows} />
      <Weir reducedMotion={reducedMotion} shadows={shadows} />
      <BoulderField shadows={shadows} />
      <CameraRig preset={preset} reducedMotion={reducedMotion} />
      <ContextWatcher onLost={onContextLost} onRestored={onContextRestored} />
    </Canvas>
  );
}
