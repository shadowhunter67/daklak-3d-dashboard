import { Html } from '@react-three/drei';
import dashboardData from '../../assets/data/dashboard-sources.json';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { useMapStore } from '../../stores/mapStore';
import { projection } from '../../utils/geo';

type LabelMap = Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;
const centerCodes = ['24133', '22015'];
const centerLabels = centerCodes.map((code) => {
  const label = (labels as LabelMap)[code];
  return [code, label, projection([label.longitude, label.latitude])! as [number, number]] as const;
});

export function MapAnnotations() {
  const showLabels = useMapStore((state) => state.labelsVisible);
  const dataMode = useMapStore((state) => state.dataMode);
  return (
    <>
      {showLabels &&
        centerLabels.map(([code, label, point]) => (
          <Html
            key={code}
            position={[point[0], -point[1], 0.34]}
            transform
            sprite
            distanceFactor={2.4}
            zIndexRange={[1, 0]}
          >
            <span className="map-label">{label.name}</span>
          </Html>
        ))}
      {dataMode === 'energy' &&
        dashboardData.energy.nodes.map((node) => {
          const point = projection([node.longitude, node.latitude])!;
          return (
            <Html
              key={node.id}
              position={[point[0], -point[1], 0.34]}
              transform
              sprite
              distanceFactor={2.2}
              zIndexRange={[1, 0]}
            >
              <span className="energy-marker" data-name={node.name} />
            </Html>
          );
        })}
    </>
  );
}
