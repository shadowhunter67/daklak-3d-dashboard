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
                position={[0, 0, active ? 0.16 : hot ? 0.1 : 0]}
              >
                <extrudeGeometry
                  args={[
                    shape,
                    {
                      depth: 0.22,
                      bevelEnabled: false,
                    },
                  ]}
                />
                <meshStandardMaterial
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
                  metalness={0.08}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {showLabels &&
        Object.entries(labels as LabelMap)
          .filter(([, v]) => v.priority === 1)
          .map(([code, label]) => {
            const p = projection([label.longitude, label.latitude])!;
            return (
              <Html key={code} position={[p[0], -p[1], 0.4]} transform sprite distanceFactor={14}>
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
      camera={{ position: [0, 13, 16], zoom: 55, near: 0.1, far: 100 }}
      onPointerMissed={() => useMapStore.getState().select(null)}
    >
      <color attach="background" args={['#071918']} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[-5, 10, 8]} intensity={3.2} color="#fff4cf" />
      <MapContent />
      <MapControls enableRotate minZoom={28} maxZoom={110} maxPolarAngle={Math.PI / 2.25} />
    </Canvas>
  );
}
