import { Html } from '@react-three/drei';
import dashboardData from '../../assets/data/dashboard-sources.json';
import { useMapStore } from '../../stores/mapStore';
import { projection } from '../../utils/geo';
import { ScreenLabels3D } from './ScreenLabels3D';

export function MapAnnotations() {
  const showLabels = useMapStore((state) => state.labelsVisible);
  const dataMode = useMapStore((state) => state.dataMode);
  return (
    <>
      {showLabels && <ScreenLabels3D />}
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
