import { Canvas } from '@react-three/fiber';
import { Html, MapControls, useTexture } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import terrainColorUrl from '../../assets/maps/daklak/daklak-terrain-color.png';
import terrainHeightUrl from '../../assets/maps/daklak/daklak-terrain-height.png';
import terrainMaskUrl from '../../assets/maps/daklak/daklak-terrain-mask.png';
import terrainNormalUrl from '../../assets/maps/daklak/daklak-terrain-normal.png';
import terrainMetadata from '../../assets/maps/daklak/daklak-terrain-metadata.json';
import type { WardCollection } from '../../types/map';
import { geometryToShapes, projection } from '../../utils/geo';
import { useMapStore } from '../../stores/mapStore';

const data = wards as WardCollection;
type LabelMap = Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;

const visibleLabels = Object.entries(labels as LabelMap).reduce<
  Array<[string, LabelMap[string], [number, number]]>
>((accepted, [code, label]) => {
  if (label.priority !== 1) return accepted;
  const point = projection([label.longitude, label.latitude])! as [number, number];
  const isFarEnough = accepted.every(
    ([, , other]) => Math.hypot(point[0] - other[0], point[1] - other[1]) > 0.72,
  );
  if (isFarEnough) accepted.push([code, label, point]);
  return accepted;
}, []);

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
  return (
    <mesh position={[(northWest[0] + southEast[0]) / 2, -(northWest[1] + southEast[1]) / 2, 0]}>
      <planeGeometry args={[width, height, 192, 160]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        displacementMap={heightMap}
        displacementScale={1.08}
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
  const hovered = useMapStore((s) => s.hoveredCode),
    selected = useMapStore((s) => s.selectedCode),
    setHovered = useMapStore((s) => s.setHovered),
    select = useMapStore((s) => s.select),
    showLabels = useMapStore((s) => s.labelsVisible);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <TerrainSurface />
      {data.features.map((feature) => {
        const code = feature.properties.code;
        const active = selected === code,
          hot = hovered === code;
        return (
          <group key={code}>
            {geometryToShapes(feature.geometry).map((shape, i) => (
              <mesh
                key={i}
                onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                  e.stopPropagation();
                  setHovered(code);
                }}
                onPointerOut={() => setHovered(null)}
                onClick={(e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  select(active ? null : code);
                }}
                position={[0, 0, active ? 1.18 : 1.12]}
              >
                <extrudeGeometry
                  args={[
                    shape,
                    {
                      depth: active ? 0.055 : 0.025,
                      bevelEnabled: false,
                    },
                  ]}
                />
                <meshStandardMaterial
                  attach="material-0"
                  color={
                    active
                      ? '#ffbb54'
                      : hot
                        ? '#86e6c1'
                        : feature.properties.type === 'phuong'
                          ? '#d3a33f'
                          : '#56d3a5'
                  }
                  roughness={0.72}
                  metalness={0.04}
                  transparent
                  opacity={active ? 0.72 : hot ? 0.5 : 0.1}
                  depthWrite={false}
                />
                <meshStandardMaterial
                  attach="material-1"
                  color={active ? '#8e6120' : hot ? '#317d68' : '#0a4d42'}
                  roughness={0.9}
                  transparent
                  opacity={active ? 0.8 : 0.16}
                  depthWrite={false}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {showLabels &&
        visibleLabels.map(([code, label, p]) => {
          return (
            <Html key={code} position={[p[0], -p[1], 1.28]} transform sprite distanceFactor={2.4}>
              <span className="map-label">{label.name}</span>
            </Html>
          );
        })}
    </group>
  );
}
export function AdministrativeMap() {
  const autoRotate = useMapStore((state) => state.autoRotate);
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
      <MapContent />
      <MapControls
        enableRotate
        autoRotate={autoRotate}
        autoRotateSpeed={0.7}
        minZoom={60}
        maxZoom={340}
        minPolarAngle={Math.PI / 7}
        maxPolarAngle={Math.PI / 2.15}
      />
    </Canvas>
  );
}
