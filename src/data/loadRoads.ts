import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

export type RoadClass = 'national' | 'provincial' | 'district';
export interface RoadProperties {
  id: string;
  name: string | null;
  reference: string | null;
  roadClass: RoadClass;
  sourceId: string;
}
export type RoadCollection = FeatureCollection<LineString | MultiLineString, RoadProperties>;

let request: Promise<RoadCollection> | null = null;

export function loadRoads() {
  request ??= fetch(`${import.meta.env.BASE_URL}data/daklak-roads.json.gz`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Road artifact unavailable (${response.status})`);
      const bytes = await response.arrayBuffer();
      if (new Uint8Array(bytes, 0, 2).every((value, index) => value === [0x1f, 0x8b][index])) {
        return new Response(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
        ).json();
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    })
    .then((value) => value as RoadCollection);
  return request;
}
