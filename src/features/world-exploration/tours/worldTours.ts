import type { MessageKey } from '../../../i18n/messages';

/**
 * Data-driven guided tours over Phase T2/T4's real, sourced POIs (`src/features/world-exploration/
 * poi/worldPoi.ts`) — no invented waypoints, no per-tour hardcoded logic (`tourEngine.ts` plays
 * any `WorldTour` the same way). With exactly 5 real, verified destinations in this repo today
 * (`verifiedTourismDestinations.ts` — the 4 from Phase T2 plus Phase T4's `krong-kmar-waterfall`,
 * added once a real, citable Wikipedia coordinate was found for it), these 3 tours are themed
 * groupings of those same 5 stops, not the illustrative "Cà phê và văn hóa" example theme from the
 * task brief — there is no sourced coffee/agriculture POI yet, and fabricating one would violate
 * this domain's own provenance rule. Add a tour here (or a 4th) once a new POI with a real source
 * exists.
 */
export interface WorldTour {
  id: string;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  /** `WorldPoi.id` values, in visit order — resolved against `worldPois` at playback time
   * (`tourEngine.ts`'s `getTourStops`), never duplicated here. */
  stops: string[];
}

export const worldTours: WorldTour[] = [
  {
    id: 'lakes-and-waterfalls',
    titleKey: 'worldExploration.tour.lakesAndWaterfalls.title',
    descriptionKey: 'worldExploration.tour.lakesAndWaterfalls.description',
    stops: ['ho-lak', 'dray-nur-waterfall', 'krong-kmar-waterfall'],
  },
  {
    id: 'forest-and-village',
    titleKey: 'worldExploration.tour.forestAndVillage.title',
    descriptionKey: 'worldExploration.tour.forestAndVillage.description',
    stops: ['yok-don-national-park', 'buon-don'],
  },
  {
    id: 'grand-tour',
    titleKey: 'worldExploration.tour.grandTour.title',
    descriptionKey: 'worldExploration.tour.grandTour.description',
    stops: [
      'yok-don-national-park',
      'buon-don',
      'dray-nur-waterfall',
      'krong-kmar-waterfall',
      'ho-lak',
    ],
  },
];

export function getWorldTourById(id: string): WorldTour | undefined {
  return worldTours.find((tour) => tour.id === id);
}
