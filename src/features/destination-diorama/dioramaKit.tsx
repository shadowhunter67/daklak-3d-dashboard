import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { subscribeWebGLContext } from '../../components/map/webglLifecycle';
import { getGraphicsQualityConfigForCurrentDevice } from '../../utils/graphicsQuality';
import {
  DEFAULT_SKY,
  type CameraPose,
  type CameraPoses,
  type CameraPresetId,
  type SkySpec,
  type SunSpec,
} from './dioramaConfig';
import { MotionContext, ShadowsContext, useReducedMotionScene, useShadows } from './dioramaContext';
import { surfaceMaterialProps, type SurfaceKind } from './dioramaMaterials';
import {
  createBoulderGeometry,
  createStreakTextureData,
  createWaterNormalData,
  seeded,
  type Placement,
} from './dioramaGeometry';
import {
  createFoamTextureData,
  createHeightfieldGeometry,
  type ForestPlacements,
  type HeightFn,
  type HeightfieldSpec,
  type TerrainColorFn,
} from './dioramaTerrain';

/** Bộ dựng chung cho mọi diorama: Canvas + ánh sáng + bầu trời + camera + địa hình + nước + cây. */

function useMatrixSetter(placements: Placement[]) {
  return useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    return (mesh: THREE.InstancedMesh | null, base: string) => {
      // Chỉ áp ma trận cho InstancedMesh thật (ref là null khi unmount; trong test jsdom là phần tử DOM).
      if (!(mesh instanceof THREE.InstancedMesh)) return;
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

/** Nhiều khối cùng một hình học (đá, tán cây, bụi) dựng bằng một lệnh vẽ. */
export function Instances({
  placements,
  seed,
  color,
  detail = 2,
  amount = 0.3,
  roughness = 0.9,
  cuts = 0,
  flat = false,
  surface = 'rock',
}: {
  placements: Placement[];
  seed: number;
  color: string;
  detail?: number;
  amount?: number;
  roughness?: number;
  /** Số mặt cắt phẳng (đá granit vỡ) — 0 cho khối tròn. */
  cuts?: number;
  /** Tô bóng theo mặt (cạnh sắc) thay vì mượt. */
  flat?: boolean;
  /** Chi tiết bề mặt sinh bằng shader: vân đá, tán lá có lỗ + AO, hoặc không. */
  surface?: SurfaceKind | 'none';
}) {
  const shadows = useShadows();
  const surfaceProps = surface === 'none' ? undefined : surfaceMaterialProps(surface);
  const geometry = useMemo(
    () => createBoulderGeometry(detail, amount, seeded(seed), cuts),
    [detail, amount, seed, cuts],
  );
  const apply = useMatrixSetter(placements);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (placements.length === 0) return null;
  return (
    <instancedMesh
      ref={(mesh) => apply(mesh, color)}
      args={[geometry, undefined, placements.length]}
      castShadow={shadows}
      receiveShadow={shadows}
    >
      <meshStandardMaterial
        vertexColors
        roughness={roughness}
        flatShading={flat}
        {...surfaceProps}
      />
    </instancedMesh>
  );
}

/** Như `Instances` nhưng dùng hình học tuỳ ý (cột bazan, bụi cỏ, cọc…). */
export function InstancedPlacements({
  geometry,
  placements,
  color,
  roughness = 0.9,
  flat = true,
}: {
  geometry: THREE.BufferGeometry;
  placements: Placement[];
  color: string;
  roughness?: number;
  flat?: boolean;
}) {
  const shadows = useShadows();
  const apply = useMatrixSetter(placements);
  if (placements.length === 0) return null;
  return (
    <instancedMesh
      ref={(mesh) => apply(mesh, color)}
      args={[geometry, undefined, placements.length]}
      castShadow={shadows}
      receiveShadow={shadows}
    >
      <meshStandardMaterial roughness={roughness} flatShading={flat} />
    </instancedMesh>
  );
}

/** Rừng lá rộng nhiệt đới từ `forestPlacements`: thân cây + ba nhóm tán sắc xanh khác nhau. */
export function Forest({
  placements,
  seed = 51,
  tones = ['#27562a', '#336a2f', '#486f35'],
}: {
  placements: ForestPlacements;
  seed?: number;
  tones?: [string, string, string];
}) {
  const shadows = useShadows();
  const trunkGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.05, 0.09, 1, 6);
    geometry.translate(0, 0.5, 0);
    return geometry;
  }, []);
  const applyTrunks = useMatrixSetter(placements.trunks);
  useEffect(() => () => trunkGeometry.dispose(), [trunkGeometry]);
  return (
    <>
      {placements.trunks.length > 0 && (
        <instancedMesh
          ref={(mesh) => applyTrunks(mesh, '#6a5238')}
          args={[trunkGeometry, undefined, placements.trunks.length]}
          castShadow={shadows}
        >
          <meshStandardMaterial roughness={1} />
        </instancedMesh>
      )}
      {placements.crowns.map((crown, index) => (
        <Instances
          key={index}
          placements={crown}
          seed={seed + index}
          color={tones[index]}
          detail={1}
          amount={0.5}
          roughness={1}
          flat
          surface="leaf"
        />
      ))}
    </>
  );
}

/** Địa hình theo hàm độ cao + bảng màu đỉnh. */
export function Heightfield({
  spec,
  height,
  color,
}: {
  spec: HeightfieldSpec;
  height: HeightFn;
  color: TerrainColorFn;
}) {
  const shadows = useShadows();
  const geometry = useMemo(
    () => createHeightfieldGeometry(spec, height, color),
    [spec, height, color],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow={shadows}>
      <meshStandardMaterial vertexColors roughness={1} {...surfaceMaterialProps('ground')} />
    </mesh>
  );
}

/** Bọt trắng loang dọc đường bờ/ven đá: lấy mẫu từ hàm độ cao quanh mực nước `level`. */
export function ShoreFoam({
  height,
  center,
  extent,
  level,
  band = 0.28,
  opacity = 0.75,
  size = 192,
}: {
  height: HeightFn;
  center: [number, number];
  extent: [number, number];
  level: number;
  band?: number;
  opacity?: number;
  size?: number;
}) {
  const [cx, cz] = center;
  const [ew, ed] = extent;
  const texture = useMemo(() => {
    const result = new THREE.DataTexture(
      createFoamTextureData(size, [cx, cz], [ew, ed], height, level, band),
      size,
      size,
      THREE.RGBAFormat,
    );
    result.magFilter = THREE.LinearFilter;
    result.minFilter = THREE.LinearFilter;
    result.needsUpdate = true;
    return result;
  }, [size, cx, cz, ew, ed, height, level, band]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, level + 0.035, cz]}>
      <planeGeometry args={[ew, ed]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

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

/** Mặt nước có sóng gợn (normal map cuộn); `shape="ellipse"` cho hồ/đầm/vũng. */
export function WaterSheet({
  position,
  size,
  color = '#3c7f8c',
  opacity = 0.86,
  normalScale = 0.35,
  repeat = 5,
  shape = 'rect',
  flow = [0.02, 0.045],
}: {
  position: [number, number, number];
  size: [number, number];
  color?: string;
  opacity?: number;
  normalScale?: number;
  repeat?: number;
  shape?: 'rect' | 'ellipse';
  flow?: [number, number];
}) {
  const reducedMotion = useReducedMotionScene();
  const shadows = useShadows();
  const normal = useMemo(() => {
    const texture = new THREE.DataTexture(
      createWaterNormalData(128, seeded(13)),
      128,
      128,
      THREE.RGBAFormat,
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, [repeat]);
  useEffect(() => () => normal.dispose(), [normal]);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, delta) => {
    const map = material.current?.normalMap;
    if (reducedMotion || !map) return;
    map.offset.x = (map.offset.x + delta * flow[0]) % 1;
    map.offset.y = (map.offset.y + delta * flow[1]) % 1;
  });
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
      scale={shape === 'ellipse' ? [size[0] / 2, size[1] / 2, 1] : [1, 1, 1]}
      receiveShadow={shadows}
    >
      {shape === 'ellipse' ? <circleGeometry args={[1, 48]} /> : <planeGeometry args={size} />}
      <meshStandardMaterial
        ref={material}
        color={color}
        normalMap={normal}
        normalScale={new THREE.Vector2(normalScale, normalScale)}
        roughness={0.05}
        metalness={0.1}
        transparent
        opacity={opacity}
        envMapIntensity={1.4}
      />
    </mesh>
  );
}

/** Màn nước đổ: texture vệt bọt cuộn xuống; đứng yên khi giảm chuyển động. */
export function FallingWater({
  position,
  width,
  height,
  tilt = 0.08,
  tint = '#a9d8e4',
  seed = 7,
}: {
  position: [number, number, number];
  width: number;
  height: number;
  tilt?: number;
  tint?: string;
  seed?: number;
}) {
  const reducedMotion = useReducedMotionScene();
  const streaks = useMemo(() => {
    const data = createStreakTextureData(64, 128, seeded(seed));
    const texture = new THREE.DataTexture(data, 64, 128, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, [seed]);
  useEffect(() => () => streaks.dispose(), [streaks]);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, delta) => {
    const map = material.current?.map;
    if (reducedMotion || !map) return;
    map.offset.y = (map.offset.y + delta * 0.55) % 1;
  });
  return (
    <mesh position={position} rotation={[tilt, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        ref={material}
        color={tint}
        map={streaks}
        transparent
        opacity={0.92}
        roughness={0.2}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Bọt trắng ở chân dòng đổ + sương bốc lên nhẹ. */
export function Mist({
  center,
  spread,
  rise = 0.9,
  count = 60,
  size = 0.55,
  opacity = 0.28,
  seed = 4,
}: {
  center: [number, number, number];
  spread: [number, number];
  rise?: number;
  count?: number;
  size?: number;
  opacity?: number;
  seed?: number;
}) {
  const reducedMotion = useReducedMotionScene();
  const spot = useSoftSpot();
  const geometry = useMemo(() => {
    const random = seeded(seed);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = center[0] + (random() - 0.5) * spread[0];
      positions[i * 3 + 1] = center[1] + random() * rise;
      positions[i * 3 + 2] = center[2] + (random() - 0.5) * spread[1];
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return result;
  }, [seed, count, center, spread, rise]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const points = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (reducedMotion) return;
    const attribute = points.current?.geometry.getAttribute('position') as
      THREE.BufferAttribute | undefined;
    if (!attribute) return;
    for (let i = 0; i < attribute.count; i++) {
      let y = attribute.getY(i) + delta * 0.1;
      if (y > center[1] + rise) y = center[1];
      attribute.setY(i, y);
    }
    attribute.needsUpdate = true;
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], center[1] - 0.02, center[2]]}>
        <planeGeometry args={[spread[0] * 1.2, spread[1] * 1.1]} />
        <meshBasicMaterial map={spot} transparent opacity={opacity * 2} depthWrite={false} />
      </mesh>
      <points ref={points} geometry={geometry}>
        <pointsMaterial map={spot} size={size} transparent opacity={opacity} depthWrite={false} />
      </points>
    </>
  );
}

function Atmosphere({ sky }: { sky: SkySpec }) {
  const gl = useThree((state) => state.gl);
  const environment = useMemo(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const texture = generator.fromScene(room, 0.04).texture;
    room.dispose();
    generator.dispose();
    return texture;
  }, [gl]);
  const background = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, sky.top);
      gradient.addColorStop(0.55, sky.mid);
      gradient.addColorStop(1, sky.bottom);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 4, 256);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [sky.top, sky.mid, sky.bottom]);
  useEffect(
    () => () => {
      environment.dispose();
      background.dispose();
    },
    [environment, background],
  );
  return (
    <>
      <primitive object={environment} attach="environment" />
      <primitive object={background} attach="background" />
      <fog attach="fog" args={[sky.bottom, sky.fogNear ?? 14, sky.fogFar ?? 42]} />
    </>
  );
}

function CameraRig({
  poses,
  preset,
  minDistance,
  maxDistance,
}: {
  poses: CameraPoses;
  preset: CameraPresetId;
  minDistance: number;
  maxDistance: number;
}) {
  const reducedMotion = useReducedMotionScene();
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const goal = useRef<CameraPose>(poses[preset]);

  useEffect(() => {
    goal.current = poses[preset];
    if (reducedMotion) {
      camera.position.set(...goal.current.position);
      controls.current?.target.set(...goal.current.target);
      controls.current?.update();
      invalidate();
    }
  }, [poses, preset, reducedMotion, camera, invalidate]);

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
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.05}
      autoRotate={false}
    />
  );
}

function ContextWatcher({ onLost, onRestored }: { onLost: () => void; onRestored: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(
    () => subscribeWebGLContext(gl.domElement, { onLost, onRestored }),
    [gl, onLost, onRestored],
  );
  return null;
}

/** Canvas chuẩn của mọi diorama: giữ loading/fallback, xử lý mất context, tôn trọng giảm chuyển động. */
export function DioramaCanvas({
  poses,
  preset,
  reducedMotion,
  onContextLost,
  onContextRestored,
  sky = DEFAULT_SKY,
  sun = { position: [9, 13, 7] },
  minDistance = 3,
  maxDistance = 18,
  children,
}: {
  poses: CameraPoses;
  preset: CameraPresetId;
  reducedMotion: boolean;
  onContextLost: () => void;
  onContextRestored: () => void;
  sky?: SkySpec;
  sun?: SunSpec;
  minDistance?: number;
  maxDistance?: number;
  children: ReactNode;
}) {
  const quality = getGraphicsQualityConfigForCurrentDevice();
  const shadows = quality.contactShadows;
  const start = poses.overview;
  return (
    <Canvas
      dpr={[1, quality.maxDevicePixelRatio]}
      gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}
      camera={{ position: start.position, fov: 42, near: 0.1, far: 90 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      shadows={shadows ? 'percentage' : false}
      scene={{ environmentIntensity: 0.4 }}
    >
      <ShadowsContext.Provider value={shadows}>
        <MotionContext.Provider value={reducedMotion}>
          <Atmosphere sky={sky} />
          <hemisphereLight args={['#eaf4ff', '#4a5a38', 0.32]} />
          <directionalLight
            position={sun.position}
            intensity={sun.intensity ?? 1.6}
            color={sun.color ?? '#fff0d0'}
            castShadow={shadows}
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-16}
            shadow-camera-right={16}
            shadow-camera-top={16}
            shadow-camera-bottom={-16}
            shadow-camera-near={1}
            shadow-camera-far={55}
            shadow-bias={-0.0004}
            shadow-normalBias={0.03}
          />
          {children}
          <CameraRig
            poses={poses}
            preset={preset}
            minDistance={minDistance}
            maxDistance={maxDistance}
          />
          <ContextWatcher onLost={onContextLost} onRestored={onContextRestored} />
        </MotionContext.Provider>
      </ShadowsContext.Provider>
    </Canvas>
  );
}
