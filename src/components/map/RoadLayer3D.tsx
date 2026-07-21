import type { Position } from 'geojson';
import { Html } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { projection } from '../../utils/geo';
import { loadRoads, type RoadClass } from '../../data/loadRoads';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { useMapStore } from '../../stores/mapStore';
import {
  buildRoadGeometryBuckets,
  buildRoadLabels3D,
  createTerrainPointProjector,
  type RoadLabel3D,
} from './roadLabels3D';
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

type LabelMap = Record<string, { longitude: number; latitude: number }>;

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

const projectFlat = (coordinate: Position) => projection([coordinate[0], coordinate[1]])!;

export function RoadLayer3D() {
  const labelsVisible = useMapStore((state) => state.labelsVisible);
  const [geometries, setGeometries] = useState<Record<RoadClass, BufferGeometry> | null>(null);
  const [roadLabels, setRoadLabels] = useState<RoadLabel3D[]>([]);
  useEffect(() => {
    let active = true;
    void Promise.all([loadRoads(), loadHeightPixels()]).then(([roads, pixels]) => {
      if (!active || !pixels) return;
      const toPoint = createTerrainPointProjector(
        pixels,
        {
          width: terrainMetadata.width,
          height: terrainMetadata.height,
          northWest: terrainNorthWest,
          terrainWidth,
          terrainHeight,
          displacementBias,
          displacementScale,
        },
        projectFlat,
      );
      const buckets = buildRoadGeometryBuckets(roads, toPoint);
      const administrativePoints = Object.values(labels as LabelMap)
        .map((label) => projection([label.longitude, label.latitude])!)
        .filter(Boolean);
      setRoadLabels(
        buildRoadLabels3D(roads, administrativePoints, projectFlat, toPoint, labelsVisible),
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
  }, [labelsVisible]);
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
          distanceFactor={label.roadClass === 'national' ? 2.2 : 2.6}
          zIndexRange={[1, 0]}
        >
          <span className={`road-label-3d road-label-3d--${label.roadClass}`}>{label.text}</span>
        </Html>
      ))}
    </>
  );
}
