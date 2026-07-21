import { Html, useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { CanvasTexture } from 'three';
import dashboardData from '../../assets/data/dashboard-sources.json';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { useMapStore } from '../../stores/mapStore';
import { projection } from '../../utils/geo';
import { layoutAdministrativeLabels } from './administrativeLabelLayout';
import {
  displacementBias,
  displacementScale,
  terrainCenter,
  terrainHeight,
  terrainHeightUrl,
  terrainMetadata,
  terrainNorthWest,
  terrainWidth,
} from './terrainConfig';

type LabelMap = Record<
  string,
  { name: string; longitude: number; latitude: number; priority: number }
>;

function AdministrativeLabels() {
  const selectedCode = useMapStore((state) => state.selectedCode);
  const heightMap = useTexture(terrainHeightUrl);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(terrainMetadata.width / 2);
    canvas.height = Math.round(terrainMetadata.height / 2);
    const context = canvas.getContext('2d');
    if (context) {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const draws = layoutAdministrativeLabels(
        labels as LabelMap,
        selectedCode,
        (longitude, latitude) => projection([longitude, latitude])!,
        canvas.width,
        canvas.height,
        terrainNorthWest,
        terrainWidth,
        terrainHeight,
      );
      draws.forEach((draw) => {
        context.font = `${draw.fontWeight} ${draw.fontSize}px "Segoe UI", "Be Vietnam Pro", Arial, sans-serif`;
        context.lineWidth = draw.strokeWidth;
        context.strokeStyle = '#041210';
        context.fillStyle = draw.fillStyle;
        context.strokeText(draw.text, draw.x, draw.y);
        context.fillText(draw.text, draw.x, draw.y);
      });
    }
    return new CanvasTexture(canvas);
  }, [selectedCode]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[terrainCenter[0], terrainCenter[1], 0.024]} raycast={() => null}>
      <planeGeometry args={[terrainWidth, terrainHeight, 96, 80]} />
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
