import type { MessageKey } from '../../../i18n/messages';

/**
 * Data-driven guided tours over Phase T2's real, sourced POIs (`src/features/world-exploration/
 * poi/worldPoi.ts`) — no invented waypoints, no per-tour hardcoded logic (`tourEngine.ts` plays
 * any `WorldTour` the same way). With exactly 4 real, verified destinations in this repo today
 * (`verifiedTourismDestinations.ts`), these 3 tours are themed groupings of those same 4 stops,
 * not the illustrative "Cà phê và văn hóa" example theme from the task brief — there is no
 * sourced coffee/agriculture POI yet, and fabricating one would violate this domain's own
 * provenance rule. Add a tour here (or a 4th) once a new POI with a real source exists.
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
    stops: ['ho-lak', 'dray-nur-waterfall'],
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
    stops: ['yok-don-national-park', 'buon-don', 'dray-nur-waterfall', 'ho-lak'],
  },
];

export function getWorldTourById(id: string): WorldTour | undefined {
  return worldTours.find((tour) => tour.id === id);
}
