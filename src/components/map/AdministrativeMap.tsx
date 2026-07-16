import { Canvas } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, useTexture } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Geometry, Position } from 'geojson';
import { CanvasTexture } from 'three';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import terrainColorUrl from '../../assets/maps/daklak/daklak-terrain-color.png';
import terrainHeightUrl from '../../assets/maps/daklak/daklak-terrain-height.png';
import terrainMaskUrl from '../../assets/maps/daklak/daklak-terrain-mask.png';
import terrainNormalUrl from '../../assets/maps/daklak/daklak-terrain-normal.png';
import terrainMetadata from '../../assets/maps/daklak/daklak-terrain-metadata.json';
import type { WardCollection } from '../../types/map';
import { projection } from '../../utils/geo';
import { useMapStore } from '../../stores/mapStore';

const data = wards as WardCollection;
type LabelMap = Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;

const centerCodes = ['24133', '22015'];
const visibleLabels = centerCodes.map((code) => {
  const label = (labels as LabelMap)[code];
  return [code, label, projection([label.longitude, label.latitude])! as [number, number]] as const;
});

function ringContains([longitude, latitude]: [number, number], ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}

function geometryContains(point: [number, number], geometry: Geometry): boolean {
  if (geometry.type === 'GeometryCollection')
    return geometry.geometries.some((part) => geometryContains(point, part));
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return false;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (polygon) =>
      Boolean(polygon[0]) &&
      ringContains(point, polygon[0]) &&
      !polygon.slice(1).some((hole) => ringContains(point, hole)),
  );
}

const featureAt = (point: [number, number]) =>
  data.features.find((feature) => geometryContains(point, feature.geometry));

function drawGeometryPath(
  context: CanvasRenderingContext2D,
  geometry: Geometry,
  project: (position: Position) => [number, number],
) {
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((part) => drawGeometryPath(context, part, project));
    return;
  }
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  polygons.forEach((polygon) =>
    polygon.forEach((ring) => {
      ring.forEach((position, index) => {
        const [x, y] = project(position);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
    }),
  );
}

function SelectedTerrainOverlay() {
  const selectedCode = useMapStore((state) => state.selectedCode);
  const heightMap = useTexture(terrainHeightUrl);
  const canvas = useMemo(() => {
    const element = document.createElement('canvas');
    element.width = terrainMetadata.width;
    element.height = terrainMetadata.height;
    return element;
  }, []);
  const selectionTexture = useMemo(() => new CanvasTexture(canvas), [canvas]);
  const [minLon, minLat, maxLon, maxLat] = terrainMetadata.bbox;
  const northWest = projection([minLon, maxLat])!;
  const southEast = projection([maxLon, minLat])!;
  const width = southEast[0] - northWest[0];
  const height = southEast[1] - northWest[1];
  useEffect(() => {
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const feature = data.features.find((item) => item.properties.code === selectedCode);
    if (feature) {
      context.beginPath();
      drawGeometryPath(context, feature.geometry, (position) => {
        const point = projection([position[0], position[1]])!;
        return [
          ((point[0] - northWest[0]) / width) * canvas.width,
          ((point[1] - northWest[1]) / height) * canvas.height,
        ];
      });
      context.fillStyle = '#ffffff';
      context.fill('evenodd');
    }
    selectionTexture.needsUpdate = true;
  }, [canvas, height, northWest, selectedCode, selectionTexture, width]);
  useEffect(() => () => selectionTexture.dispose(), [selectionTexture]);
  if (!selectedCode) return null;
  return (
    <mesh
      position={[(northWest[0] + southEast[0]) / 2, -(northWest[1] + southEast[1]) / 2, 0.008]}
      raycast={() => null}
    >
      <planeGeometry args={[width, height, 192, 160]} />
      <meshStandardMaterial
        color="#ffd66b"
        emissive="#a66a12"
        emissiveIntensity={0.55}
        displacementMap={heightMap}
        displacementScale={0.2}
        displacementBias={0.02}
        alphaMap={selectionTexture}
        alphaTest={0.08}
        transparent
        opacity={0.72}
        depthWrite={false}
        roughness={0.72}
      />
    </mesh>
  );
}

function TerrainSurface() {
  const [colorMap, heightMap, normalMap, alphaMap] = useTexture([
    terrainColorUrl,
    terrainHeightUrl,
    terrainNormalUrl,
    terrainMaskUrl,
  ]);
  const [minLon, minLat, maxLon, maxLat] = terrainMetadata.bbox;
  const northWest = projection([minLon, maxLat])!;
  const southEast = projection([maxLon, minLat])!;
  const width = southEast[0] - northWest[0];
  const height = southEast[1] - northWest[1];
  const setHovered = useMapStore((state) => state.setHovered);
  const select = useMapStore((state) => state.select);
  const codeFromEvent = (event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>) => {
    if (!event.uv || !projection.invert) return null;
    const projectedX = northWest[0] + event.uv.x * width;
    const projectedY = southEast[1] - event.uv.y * height;
    const coordinate = projection.invert([projectedX, projectedY]);
    return coordinate ? (featureAt(coordinate)?.properties.code ?? null) : null;
  };
  return (
    <mesh
      position={[(northWest[0] + southEast[0]) / 2, -(northWest[1] + southEast[1]) / 2, 0]}
      onPointerMove={(event) => {
        event.stopPropagation();
        const code = codeFromEvent(event);
        if (useMapStore.getState().hoveredCode !== code) setHovered(code);
        document.body.style.cursor = code ? 'pointer' : 'default';
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = 'default';
      }}
      onClick={(event) => {
        event.stopPropagation();
        const code = codeFromEvent(event);
        if (code) select(useMapStore.getState().selectedCode === code ? null : code);
      }}
    >
      <planeGeometry args={[width, height, 192, 160]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        displacementMap={heightMap}
        displacementScale={0.2}
        displacementBias={0.02}
        alphaMap={alphaMap}
        alphaTest={0.25}
        roughness={0.82}
        metalness={0.02}
      />
    </mesh>
  );
}

function MapContent() {
  const showLabels = useMapStore((s) => s.labelsVisible);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <TerrainSurface />
      <SelectedTerrainOverlay />
      {showLabels &&
        visibleLabels.map(([code, label, p]) => {
          return (
            <Html key={code} position={[p[0], -p[1], 0.34]} transform sprite distanceFactor={2.4}>
              <span className="map-label">{label.name}</span>
            </Html>
          );
        })}
    </group>
  );
}

function CameraControls() {
  const controls = useRef<OrbitControlsImpl>(null);
  const pressed = useRef(new Set<string>());
  const autoRotate = useMapStore((state) => state.autoRotate);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(event.key)
      ) {
        event.preventDefault();
        pressed.current.add(event.key.toLowerCase());
      }
    };
    const up = (event: KeyboardEvent) => pressed.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
  useFrame((_, delta) => {
    const control = controls.current;
    if (!control) return;
    const speed = delta * 1.25;
    if (pressed.current.has('arrowleft') || pressed.current.has('a'))
      control.setAzimuthalAngle(control.getAzimuthalAngle() - speed);
    if (pressed.current.has('arrowright') || pressed.current.has('d'))
      control.setAzimuthalAngle(control.getAzimuthalAngle() + speed);
    if (pressed.current.has('arrowup') || pressed.current.has('w'))
      control.setPolarAngle(Math.max(Math.PI / 7, control.getPolarAngle() - speed));
    if (pressed.current.has('arrowdown') || pressed.current.has('s'))
      control.setPolarAngle(Math.min(Math.PI / 2.15, control.getPolarAngle() + speed));
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableRotate
      autoRotate={autoRotate}
      autoRotateSpeed={0.7}
      minZoom={60}
      maxZoom={340}
      minPolarAngle={Math.PI / 7}
      maxPolarAngle={Math.PI / 2.15}
    />
  );
}
export function AdministrativeMap() {
  return (
    <Canvas
      dpr={[1, 1.35]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      orthographic
      camera={{ position: [0, 8.2, 15.5], zoom: 246, near: 0.1, far: 100 }}
      onPointerMissed={() => useMapStore.getState().select(null)}
    >
      <color attach="background" args={['#071918']} />
      <hemisphereLight args={['#b9f0dd', '#031b19', 1.35]} />
      <directionalLight position={[-6, 9, 7]} intensity={3.8} color="#fff0c2" />
      <gridHelper args={[18, 36, '#315e57', '#143633']} position={[0, -0.055, 0]} />
      <MapContent />
      <ContactShadows
        position={[0, -0.045, 0]}
        opacity={0.32}
        scale={12}
        blur={2.6}
        far={4}
        resolution={256}
        color="#000d0c"
      />
      <CameraControls />
    </Canvas>
  );
}
