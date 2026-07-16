import { useTexture } from '@react-three/drei';
import type { Geometry, Position } from 'geojson';
import { CanvasTexture } from 'three';
import { useEffect, useMemo } from 'react';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import { useMapStore } from '../../stores/mapStore';
import { projection } from '../../utils/geo';
import { wardData } from './geometryHitTest';
import {
  displacementBias,
  displacementScale,
  terrainCenter,
  terrainHeight,
  terrainHeightUrl,
  terrainMaskUrl,
  terrainMetadata,
  terrainNorthWest,
  terrainSegments,
  terrainWidth,
} from './terrainConfig';

type LabelMap = Record<string, { longitude: number; latitude: number }>;
const heatPoints = Object.entries(metrics)
  .sort(([, first], [, second]) => second.population - first.population)
  .slice(0, 20)
  .map(([code, metric]) => {
    const label = (labels as LabelMap)[code];
    return { metric, point: projection([label.longitude, label.latitude])! as [number, number] };
  });

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

export function HeatmapOverlay() {
  const [heightMap, terrainMask] = useTexture([terrainHeightUrl, terrainMaskUrl]);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = terrainMetadata.width;
    canvas.height = terrainMetadata.height;
    const context = canvas.getContext('2d');
    if (context) {
      context.globalCompositeOperation = 'lighter';
      const populations = heatPoints.map(({ metric }) => metric.population);
      const maximum = Math.max(...populations);
      const minimum = Math.min(...populations);
      heatPoints.forEach(({ metric, point }) => {
        const x = ((point[0] - terrainNorthWest[0]) / terrainWidth) * canvas.width;
        const y = ((point[1] - terrainNorthWest[1]) / terrainHeight) * canvas.height;
        const intensity = (metric.population - minimum) / Math.max(maximum - minimum, 1);
        const radius = 48 + intensity * 50;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(255, 48, 12, ${0.82 + intensity * 0.16})`);
        gradient.addColorStop(0.24, 'rgba(255, 193, 28, .78)');
        gradient.addColorStop(0.52, 'rgba(25, 220, 180, .54)');
        gradient.addColorStop(1, 'rgba(10, 180, 190, 0)');
        context.fillStyle = gradient;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      });
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[terrainCenter[0], terrainCenter[1], 0.012]} raycast={() => null}>
      <planeGeometry args={[terrainWidth, terrainHeight, ...terrainSegments]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.55}
        displacementMap={heightMap}
        displacementScale={displacementScale}
        displacementBias={displacementBias}
        alphaMap={terrainMask}
        alphaTest={0.01}
        transparent
        opacity={0.9}
        depthWrite={false}
        toneMapped={false}
        roughness={0.9}
      />
    </mesh>
  );
}

export function SelectionOverlay() {
  const selectedCode = useMapStore((state) => state.selectedCode);
  const heightMap = useTexture(terrainHeightUrl);
  const canvas = useMemo(() => {
    const element = document.createElement('canvas');
    element.width = terrainMetadata.width;
    element.height = terrainMetadata.height;
    return element;
  }, []);
  const texture = useMemo(() => new CanvasTexture(canvas), [canvas]);
  useEffect(() => {
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const feature = wardData.features.find((item) => item.properties.code === selectedCode);
    if (feature) {
      context.beginPath();
      drawGeometryPath(context, feature.geometry, (position) => {
        const point = projection([position[0], position[1]])!;
        return [
          ((point[0] - terrainNorthWest[0]) / terrainWidth) * canvas.width,
          ((point[1] - terrainNorthWest[1]) / terrainHeight) * canvas.height,
        ];
      });
      context.fillStyle = '#ffffff';
      context.fill('evenodd');
    }
    texture.needsUpdate = true;
  }, [canvas, selectedCode, texture]);
  useEffect(() => () => texture.dispose(), [texture]);
  if (!selectedCode) return null;
  return (
    <mesh position={[terrainCenter[0], terrainCenter[1], 0.016]} raycast={() => null}>
      <planeGeometry args={[terrainWidth, terrainHeight, ...terrainSegments]} />
      <meshStandardMaterial
        color="#ffd66b"
        emissive="#a66a12"
        emissiveIntensity={0.55}
        displacementMap={heightMap}
        displacementScale={displacementScale}
        displacementBias={displacementBias}
        alphaMap={texture}
        alphaTest={0.08}
        transparent
        opacity={0.72}
        depthWrite={false}
        roughness={0.72}
      />
    </mesh>
  );
}
