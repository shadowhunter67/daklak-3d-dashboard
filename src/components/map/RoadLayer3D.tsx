import type { LineString, MultiLineString, Position } from 'geojson';
import { useEffect, useState } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { projection } from '../../utils/geo';
import { loadRoads, type RoadClass } from '../../data/loadRoads';
import {
  displacementBias,
  displacementScale,
  terrainHeight,
  terrainHeightUrl,
  terrainMetadata,
  terrainNorthWest,
  terrainWidth,
} from './terrainConfig';

const styles: Record<RoadClass, { color: string; opacity: number }> = {
  national: { color: '#ffd166', opacity: 1 },
  provincial: { color: '#f3a44a', opacity: 0.94 },
  district: { color: '#d9e5df', opacity: 0.72 },
};

async function loadHeightPixels() {
  const image = new Image();
  image.src = terrainHeightUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context?.drawImage(image, 0, 0);
  return context?.getImageData(0, 0, canvas.width, canvas.height).data ?? null;
}

function parts(geometry: LineString | MultiLineString): Position[][] {
  return geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
}

export function RoadLayer3D() {
  const [geometries, setGeometries] = useState<Record<RoadClass, BufferGeometry> | null>(null);
  const [roadLabels, setRoadLabels] = useState<
    Array<{ text: string; position: [number, number, number] }>
  >([]);
  useEffect(() => {
    let active = true;
    void Promise.all([loadRoads(), loadHeightPixels()]).then(([roads, pixels]) => {
      if (!active || !pixels) return;
      const buckets: Record<RoadClass, number[]> = { national: [], provincial: [], district: [] };
      const width = terrainMetadata.width;
      const height = terrainMetadata.height;
      const point = (coordinate: Position) => {
        const projected = projection([coordinate[0], coordinate[1]])!;
        const px = Math.max(
          0,
          Math.min(
            width - 1,
            Math.round(((projected[0] - terrainNorthWest[0]) / terrainWidth) * (width - 1)),
          ),
        );
        const py = Math.max(
          0,
          Math.min(
            height - 1,
            Math.round(((projected[1] - terrainNorthWest[1]) / terrainHeight) * (height - 1)),
          ),
        );
        const elevation = pixels[(py * width + px) * 4] / 255;
        return [
          projected[0],
          -projected[1],
          displacementBias + elevation * displacementScale + 0.008,
        ];
      };
      roads.features.forEach((road) =>
        parts(road.geometry).forEach((line) => {
          for (let index = 1; index < line.length; index += 1) {
            buckets[road.properties.roadClass].push(
              ...point(line[index - 1]),
              ...point(line[index]),
            );
          }
        }),
      );
      const named = new Map<string, { coordinate: Position; score: number }>();
      roads.features
        .filter((road) => road.properties.roadClass !== 'district')
        .forEach((road) => {
          const text = road.properties.reference?.trim() || road.properties.name?.trim();
          if (!text) return;
          parts(road.geometry).forEach((line) => {
            const score = line.length + (road.properties.roadClass === 'national' ? 10_000 : 0);
            if (!named.has(text) || named.get(text)!.score < score) {
              named.set(text, { coordinate: line[Math.floor(line.length / 2)], score });
            }
          });
        });
      setRoadLabels(
        [...named.entries()]
          .sort((first, second) => second[1].score - first[1].score)
          .slice(0, 16)
          .map(([text, value]) => ({
            text,
            position: point(value.coordinate) as [number, number, number],
          })),
      );
      const next = Object.fromEntries(
        Object.entries(buckets).map(([roadClass, positions]) => {
          const geometry = new BufferGeometry();
          geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
          return [roadClass, geometry];
        }),
      ) as Record<RoadClass, BufferGeometry>;
      setGeometries(next);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(
    () => () => Object.values(geometries ?? {}).forEach((geometry) => geometry.dispose()),
    [geometries],
  );
  if (!geometries) return null;
  return (
    <>
      {(Object.keys(styles) as RoadClass[]).map((roadClass) => (
        <lineSegments key={roadClass} geometry={geometries[roadClass]} raycast={() => null}>
          <lineBasicMaterial
            color={styles[roadClass].color}
            transparent
            opacity={styles[roadClass].opacity}
            depthWrite={false}
          />
        </lineSegments>
      ))}
      {roadLabels.map((label) => (
        <Html
          key={label.text}
          position={label.position}
          transform
          sprite
          distanceFactor={1.8}
          zIndexRange={[1, 0]}
        >
          <span className="road-label-3d">{label.text}</span>
        </Html>
      ))}
    </>
  );
}
import { Html } from '@react-three/drei';
