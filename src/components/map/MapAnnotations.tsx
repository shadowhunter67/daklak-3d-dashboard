import { Html, useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { CanvasTexture } from 'three';
import dashboardData from '../../assets/data/dashboard-sources.json';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { useMapStore } from '../../stores/mapStore';
import { projection } from '../../utils/geo';
import {
  displacementBias,
  displacementScale,
  terrainCenter,
  terrainHeight,
  terrainHeightUrl,
  terrainMetadata,
  terrainNorthWest,
  terrainSegments,
  terrainWidth,
} from './terrainConfig';

type LabelMap = Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;

function AdministrativeLabels() {
  const selectedCode = useMapStore((state) => state.selectedCode);
  const hoveredCode = useMapStore((state) => state.hoveredCode);
  const heightMap = useTexture(terrainHeightUrl);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = terrainMetadata.width;
    canvas.height = terrainMetadata.height;
    const context = canvas.getContext('2d');
    if (context) {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      Object.entries(labels as LabelMap).forEach(([code, label]) => {
        const point = projection([label.longitude, label.latitude])!;
        const x = ((point[0] - terrainNorthWest[0]) / terrainWidth) * canvas.width;
        const y = ((point[1] - terrainNorthWest[1]) / terrainHeight) * canvas.height;
        const emphasized = code === selectedCode || code === hoveredCode;
        const size = emphasized ? 15 : label.priority === 1 ? 10 : 8;
        context.font = `${emphasized ? 700 : 600} ${size}px "Segoe UI", "Be Vietnam Pro", Arial, sans-serif`;
        context.lineWidth = emphasized ? 4 : 3;
        context.strokeStyle = '#041210';
        context.fillStyle = emphasized ? '#ffe49a' : '#f3f0d8';
        context.strokeText(label.name.normalize('NFC'), x, y);
        context.fillText(label.name.normalize('NFC'), x, y);
      });
    }
    return new CanvasTexture(canvas);
  }, [hoveredCode, selectedCode]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[terrainCenter[0], terrainCenter[1], 0.024]} raycast={() => null}>
      <planeGeometry args={[terrainWidth, terrainHeight, ...terrainSegments]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.8}
        displacementMap={heightMap}
        displacementScale={displacementScale}
        displacementBias={displacementBias}
        transparent
        depthWrite={false}
        toneMapped={false}
        roughness={1}
      />
    </mesh>
  );
}

export function MapAnnotations() {
  const showLabels = useMapStore((state) => state.labelsVisible);
  const dataMode = useMapStore((state) => state.dataMode);
  return (
    <>
      {showLabels && <AdministrativeLabels />}
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
