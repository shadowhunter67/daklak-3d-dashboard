import type { Geometry, Position } from 'geojson';

export function drawGeometryPath(
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
