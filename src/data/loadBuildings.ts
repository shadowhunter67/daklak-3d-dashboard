import type { FeatureCollection, Polygon } from 'geojson';

export type BuildingHeightMethod = 'osm-height-tag' | 'osm-levels-tag' | 'estimated-default-levels';

export interface BuildingProperties {
  id: string;
  name: string | null;
  buildingType: string;
  /** Illustrative massing height, not a surveyed measurement — see `heightMethod`. */
  heightMeters: number;
  heightMethod: BuildingHeightMethod;
  sourceId: string;
}

export type BuildingCollection = FeatureCollection<Polygon, BuildingProperties>;

let request: Promise<BuildingCollection> | null = null;

/**
 * Pilot ward only (phường Buôn Ma Thuột, code 24133) — `scripts/build_daklak_buildings.py`'s doc
 * comment explains why this starts narrow rather than the whole province. Same fetch/gunzip
 * pattern as `loadRoads.ts` (`daklak-roads.json.gz`), which this was copied from.
 */
export function loadBuonMaThuotBuildings() {
  request ??= fetch(`${import.meta.env.BASE_URL}data/daklak-buildings-buon-ma-thuot.json.gz`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Building artifact unavailable (${response.status})`);
      const bytes = await response.arrayBuffer();
      if (new Uint8Array(bytes, 0, 2).every((value, index) => value === [0x1f, 0x8b][index])) {
        return new Response(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
        ).json();
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    })
    .then((value) => value as BuildingCollection);
  return request;
}
