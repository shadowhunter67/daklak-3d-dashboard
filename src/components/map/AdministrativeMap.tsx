import { Canvas } from '@react-three/fiber';
import { Html, MapControls } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import labels from '../../assets/maps/daklak/daklak-labels.json';
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

function MapContent() {
  const hovered = useMapStore((s) => s.hoveredCode),
    selected = useMapStore((s) => s.selectedCode),
    setHovered = useMapStore((s) => s.setHovered),
    select = useMapStore((s) => s.select),
    showLabels = useMapStore((s) => s.labelsVisible);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
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
                position={[0, 0, active ? 0.24 : hot ? 0.12 : 0]}
              >
                <extrudeGeometry
                  args={[
                    shape,
                    {
                      depth: active ? 0.72 : 0.58,
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
                          ? '#319f8e'
                          : '#17685d'
                  }
                  roughness={0.72}
                  metalness={0.04}
                />
                <meshStandardMaterial
                  attach="material-1"
                  color={active ? '#8e6120' : hot ? '#317d68' : '#083f39'}
                  roughness={0.9}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {showLabels &&
        visibleLabels.map(([code, label, p]) => {
          return (
            <Html key={code} position={[p[0], -p[1], 0.78]} transform sprite distanceFactor={7}>
              <span className="map-label">{label.name}</span>
            </Html>
          );
        })}
    </group>
  );
}
export function AdministrativeMap() {
  return (
    <Canvas
      dpr={[1, 1.35]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      orthographic
      camera={{ position: [0, 8.5, 15.5], zoom: 58, near: 0.1, far: 100 }}
      onPointerMissed={() => useMapStore.getState().select(null)}
    >
      <color attach="background" args={['#071918']} />
      <hemisphereLight args={['#b9f0dd', '#031b19', 1.35]} />
      <directionalLight position={[-6, 9, 7]} intensity={3.8} color="#fff0c2" />
      <MapContent />
      <MapControls enableRotate minZoom={28} maxZoom={110} maxPolarAngle={Math.PI / 2.25} />
    </Canvas>
  );
}
