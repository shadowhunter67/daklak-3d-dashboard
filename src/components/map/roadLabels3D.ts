import type { LineString, MultiLineString, Position } from 'geojson';
import type { RoadClass, RoadCollection } from '../../data/loadRoads';

export function parts(geometry: LineString | MultiLineString): Position[][] {
  return geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
}

export interface TerrainPointConfig {
  width: number;
  height: number;
  northWest: [number, number];
  terrainWidth: number;
  terrainHeight: number;
  displacementBias: number;
  displacementScale: number;
}

export function createTerrainPointProjector(
  pixels: Uint8ClampedArray,
  config: TerrainPointConfig,
  projectFlat: (coordinate: Position) => [number, number],
) {
  return (coordinate: Position): [number, number, number] => {
    const projected = projectFlat(coordinate);
    const px = Math.max(
      0,
      Math.min(
        config.width - 1,
        Math.round(
          ((projected[0] - config.northWest[0]) / config.terrainWidth) * (config.width - 1),
        ),
      ),
    );
    const py = Math.max(
      0,
      Math.min(
        config.height - 1,
        Math.round(
          ((projected[1] - config.northWest[1]) / config.terrainHeight) * (config.height - 1),
        ),
      ),
    );
    const elevation = pixels[(py * config.width + px) * 4] / 255;
    return [
      projected[0],
      -projected[1],
      config.displacementBias + elevation * config.displacementScale + 0.008,
    ];
  };
}

export function buildRoadGeometryBuckets(
  roads: RoadCollection,
  toPoint: (coordinate: Position) => [number, number, number],
): Record<RoadClass, number[]> {
  const buckets: Record<RoadClass, number[]> = { national: [], provincial: [], district: [] };
  roads.features.forEach((road) =>
    parts(road.geometry).forEach((line) => {
      for (let index = 1; index < line.length; index += 1) {
        buckets[road.properties.roadClass].push(
          ...toPoint(line[index - 1]),
          ...toPoint(line[index]),
        );
      }
    }),
  );
  return buckets;
}

export interface RoadLabel3D {
  text: string;
  roadClass: RoadClass;
  position: [number, number, number];
}

export function buildRoadLabels3D(
  roads: RoadCollection,
  administrativePoints: [number, number][],
  projectFlat: (coordinate: Position) => [number, number],
  toPoint: (coordinate: Position) => [number, number, number],
  labelsVisible: boolean,
): RoadLabel3D[] {
  const named = new Map<
    string,
    { coordinate: Position; projected: [number, number]; roadClass: RoadClass; score: number }
  >();
  roads.features
    .filter((road) => road.properties.roadClass !== 'district')
    .forEach((road) => {
      const text = road.properties.reference?.trim() || road.properties.name?.trim();
      if (!text) return;
      parts(road.geometry).forEach((line) => {
        const score = line.length + (road.properties.roadClass === 'national' ? 10_000 : 0);
        if (!named.has(text) || named.get(text)!.score < score) {
          const coordinate = line[Math.floor(line.length / 2)];
          named.set(text, {
            coordinate,
            projected: projectFlat(coordinate),
            roadClass: road.properties.roadClass,
            score,
          });
        }
      });
    });
  return [...named.entries()]
    .sort((first, second) => second[1].score - first[1].score)
    .filter(([, value]) => {
      if (value.roadClass === 'national') return true;
      return !administrativePoints.some(
        (point) => Math.hypot(point[0] - value.projected[0], point[1] - value.projected[1]) < 18,
      );
    })
    .slice(0, labelsVisible ? 8 : 14)
    .map(([text, value]) => ({
      text,
      roadClass: value.roadClass,
      position: toPoint(value.coordinate),
    }));
}
