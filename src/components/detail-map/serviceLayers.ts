import type {
  CircleLayerSpecification,
  LayerSpecification,
  VectorSourceSpecification,
} from 'maplibre-gl';
import { OPENSTREETMAP_ATTRIBUTION } from './roadLayers';

/**
 * Public-service point-of-interest layer (bệnh viện/trường học/cơ quan nhà nước) — a SEPARATE,
 * standalone PMTiles archive from `roadLayers.ts`'s `daklak.pmtiles` (roads/buildings/places),
 * NOT a 4th `source-layer` merged into that same file. Deliberate: reproducing the exact
 * tippecanoe flags that archive's 3 existing layers were built with (in particular roads'
 * zoom-tiered `--feature-filter-file`, whose content was never committed — see
 * docs/detail-map-integration.md) risks silently changing already-shipped, documented output.
 * A second small archive (~114KB — see docs/data-provenance.md) avoids that risk entirely for a
 * negligible size cost, at the price of one extra HTTP source instead of reusing the existing one.
 *
 * Built from the SAME pinned Geofabrik Vietnam extract + this project's own Đắk Lắk clip polygon
 * as `daklak.pmtiles` (see docs/detail-map-integration.md's "Building the real PMTiles source" —
 * this layer's own build is documented as a follow-on section there), filtered to OSM
 * `amenity=hospital,clinic,doctors,pharmacy,school,university,college,kindergarten,townhall,
 * police,post_office,courthouse` + `office=government`, NODES ONLY (matches `places`' `n/` filter
 * convention in roadLayers.ts — some hospitals/schools are mapped as building ways in OSM, not
 * nodes, so this deliberately undercounts vs. a full way+centroid pipeline; a known limitation,
 * not a bug, see the dataset's `knownLimitations`).
 *
 * `SERVICES_SOURCE_LAYER` is a hard contract with the tippecanoe build (`-l services`) — must
 * match exactly or MapLibre silently renders nothing.
 */
export const SERVICES_VECTOR_SOURCE_ID = 'daklak-services';
export const SERVICES_SOURCE_LAYER = 'services';
export const SERVICES_POINTS_LAYER_ID = 'services-points';
export const SERVICES_LABELS_LAYER_ID = 'services-labels';

/** Broad category buckets a viewer actually reasons about — OSM's raw `amenity`/`office` values
 * are finer-grained than useful for a province-wide color legend. Mirrors this project's existing
 * "schematic category, real point" pattern (planningThemes.ts's classify(), but here the POINT
 * itself is real OSM data — only the 3-way bucketing is this file's own simplification). */
const HEALTH_AMENITIES = ['hospital', 'clinic', 'doctors', 'pharmacy'];
const EDUCATION_AMENITIES = ['school', 'university', 'college', 'kindergarten'];
const GOVERNMENT_AMENITIES = ['townhall', 'police', 'post_office', 'courthouse'];

export const SERVICE_CATEGORY_COLOR = {
  health: '#e2585a',
  education: '#4a90d9',
  government: '#9a6bd6',
  other: '#c9a24a',
} as const;

export function buildServicesSource(url: string): VectorSourceSpecification {
  return {
    type: 'vector',
    url: `pmtiles://${url}`,
    attribution: OPENSTREETMAP_ATTRIBUTION,
  };
}

/** `amenity` decides the bucket first (more features carry it than `office`); `office=government`
 * (the only office value this dataset's tags-filter admits, see docstring above) falls through to
 * `government` whenever `amenity` is absent — a node in this layer always has exactly one of the
 * two, never both, per the osmium tags-filter that produced it. Typed as `unknown` cast, same
 * pattern as `planningLayers.ts::planningFillColorExpression` — the maplibre-gl expression types
 * don't model `match`'s variadic case-array shape precisely enough to type-check a literal here. */
function categoryColorExpression(): NonNullable<CircleLayerSpecification['paint']>['circle-color'] {
  return [
    'match',
    ['get', 'amenity'],
    HEALTH_AMENITIES,
    SERVICE_CATEGORY_COLOR.health,
    EDUCATION_AMENITIES,
    SERVICE_CATEGORY_COLOR.education,
    GOVERNMENT_AMENITIES,
    SERVICE_CATEGORY_COLOR.government,
    // No amenity match (including "no amenity tag at all" — the office=government-only nodes) ->
    // government color, since that IS this dataset's only non-amenity category.
    SERVICE_CATEGORY_COLOR.government,
  ] as unknown as NonNullable<CircleLayerSpecification['paint']>['circle-color'];
}

/** `minzoom: 11` — deliberately later than `hamlet-labels`' 13 but earlier than `buildings`' 13,
 * so a viewer scanning for "where's the nearest hospital" at a district-wide zoom already sees
 * them, without adding to the province-wide-overview clutter `roadLayers.ts`'s doc comment already
 * had to fight for hamlet place names (a much larger feature count there, 12k+ villages vs. this
 * layer's 506 total points — see docs/data-provenance.md). */
export function buildServicePointLayers(withLabels: boolean): LayerSpecification[] {
  const layers: LayerSpecification[] = [
    {
      id: SERVICES_POINTS_LAYER_ID,
      type: 'circle',
      source: SERVICES_VECTOR_SOURCE_ID,
      'source-layer': SERVICES_SOURCE_LAYER,
      minzoom: 11,
      // Starts hidden — servicesVisible defaults to false (DEFAULT_DETAIL_MAP_LAYER_STATE), same
      // "off by default" convention/mechanism as planningZoneLayers.ts. MapLibreProvider's
      // setServicesVisible() flips this via setLayoutProperty, never a style rebuild.
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': 4,
        'circle-color': categoryColorExpression(),
        'circle-stroke-width': 1,
        'circle-stroke-color': '#071918',
      },
    },
  ];
  if (withLabels) {
    layers.push({
      id: SERVICES_LABELS_LAYER_ID,
      type: 'symbol',
      source: SERVICES_VECTOR_SOURCE_ID,
      'source-layer': SERVICES_SOURCE_LAYER,
      minzoom: 14,
      filter: ['has', 'name'],
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-font': ['Noto Sans Regular'],
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#f0e6d2',
        'text-halo-color': '#071918',
        'text-halo-width': 1.2,
      },
    });
  }
  return layers;
}
