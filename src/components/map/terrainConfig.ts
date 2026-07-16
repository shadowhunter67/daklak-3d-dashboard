import terrainColorUrl from '../../assets/maps/daklak/daklak-terrain-color.png';
import terrainHeightUrl from '../../assets/maps/daklak/daklak-terrain-height.png';
import terrainMaskUrl from '../../assets/maps/daklak/daklak-terrain-mask.png';
import terrainNormalUrl from '../../assets/maps/daklak/daklak-terrain-normal.png';
import terrainMetadata from '../../assets/maps/daklak/daklak-terrain-metadata.json';
import { projection } from '../../utils/geo';

const [minLon, minLat, maxLon, maxLat] = terrainMetadata.bbox;
export const terrainNorthWest = projection([minLon, maxLat])!;
export const terrainSouthEast = projection([maxLon, minLat])!;
export const terrainWidth = terrainSouthEast[0] - terrainNorthWest[0];
export const terrainHeight = terrainSouthEast[1] - terrainNorthWest[1];
export const terrainCenter: [number, number, number] = [
  (terrainNorthWest[0] + terrainSouthEast[0]) / 2,
  -(terrainNorthWest[1] + terrainSouthEast[1]) / 2,
  0,
];
export const terrainSegments: [number, number] = [192, 160];
export const displacementScale = 0.2;
export const displacementBias = 0.02;

export { terrainColorUrl, terrainHeightUrl, terrainMaskUrl, terrainNormalUrl, terrainMetadata };
