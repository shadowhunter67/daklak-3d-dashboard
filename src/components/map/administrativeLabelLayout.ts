export interface AdministrativeLabelSource {
  name: string;
  longitude: number;
  latitude: number;
  priority: number;
}

export interface AdministrativeLabelDraw {
  code: string;
  text: string;
  x: number;
  y: number;
  fontWeight: number;
  fontSize: number;
  strokeWidth: number;
  fillStyle: string;
}

export function layoutAdministrativeLabels(
  labels: Record<string, AdministrativeLabelSource>,
  selectedCode: string | null,
  project: (longitude: number, latitude: number) => [number, number],
  canvasWidth: number,
  canvasHeight: number,
  northWest: [number, number],
  terrainWidth: number,
  terrainHeight: number,
): AdministrativeLabelDraw[] {
  return Object.entries(labels).map(([code, label]) => {
    const point = project(label.longitude, label.latitude);
    const x = ((point[0] - northWest[0]) / terrainWidth) * canvasWidth;
    const y = ((point[1] - northWest[1]) / terrainHeight) * canvasHeight;
    const emphasized = code === selectedCode;
    const fontSize = emphasized ? 13 : label.priority === 1 ? 10 : 8;
    return {
      code,
      text: label.name.normalize('NFC'),
      x,
      y,
      fontWeight: emphasized ? 700 : 600,
      fontSize,
      strokeWidth: emphasized ? 3.5 : 3,
      fillStyle: emphasized ? '#ffe49a' : '#f3f0d8',
    };
  });
}
