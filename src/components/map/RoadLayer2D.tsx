import { geoPath, type GeoProjection } from 'd3-geo';
import { useEffect, useMemo, useState } from 'react';
import { loadRoads, type RoadCollection } from '../../data/loadRoads';

export function RoadLayer2D({ projection }: { projection: GeoProjection }) {
  const [roads, setRoads] = useState<RoadCollection | null>(null);
  useEffect(() => {
    let active = true;
    void loadRoads().then((collection) => {
      if (active) setRoads(collection);
    });
    return () => {
      active = false;
    };
  }, []);
  const path = useMemo(() => geoPath(projection), [projection]);
  if (!roads) return <g data-testid="roads-loading" />;
  return (
    <g className="map-roads" aria-label="Mạng lưới đường OpenStreetMap">
      {roads.features.map((road) => (
        <path
          key={road.properties.id}
          className={`map-road map-road--${road.properties.roadClass}`}
          d={path(road) ?? undefined}
          data-road-id={road.properties.id}
        />
      ))}
    </g>
  );
}
