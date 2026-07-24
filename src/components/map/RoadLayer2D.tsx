import { geoPath, type GeoProjection } from 'd3-geo';
import { useEffect, useMemo, useState } from 'react';
import { loadRoads, type RoadCollection } from '../../data/loadRoads';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { useMapStore } from '../../stores/mapStore';
import { buildRoadLabels2D } from './roadLabels2D';
import { useTranslation } from '../../i18n/useTranslation';

type LabelMap = Record<string, { longitude: number; latitude: number }>;

export function RoadLayer2D({
  projection,
  compact,
}: {
  projection: GeoProjection;
  compact: boolean;
}) {
  const { t } = useTranslation();
  const labelsVisible = useMapStore((state) => state.labelsVisible);
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
  const roadLabels = useMemo(() => {
    if (!roads) return [];
    const administrativePoints = Object.values(labels as LabelMap)
      .map((label) => projection([label.longitude, label.latitude])! as [number, number])
      .filter(Boolean);
    return buildRoadLabels2D(roads, administrativePoints, projection, labelsVisible, compact);
  }, [compact, labelsVisible, projection, roads]);
  if (!roads) return <g data-testid="roads-loading" />;
  return (
    <g className="map-roads" aria-label={t('map2d.roadNetworkAria')}>
      {roads.features.map((road) => (
        <path
          key={road.properties.id}
          className={`map-road map-road--${road.properties.roadClass}`}
          d={path(road) ?? undefined}
          data-road-id={road.properties.id}
        />
      ))}
      <g className="map-road-labels" aria-hidden="true">
        {roadLabels.map((label) => (
          <text key={label.id} x={label.point[0]} y={label.point[1]}>
            {label.text}
          </text>
        ))}
      </g>
    </g>
  );
}
