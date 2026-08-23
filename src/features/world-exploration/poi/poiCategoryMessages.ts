import type { TourismDestinationCategory } from '../../../entities/tourism/types';
import type { MessageKey } from '../../../i18n/messages';

/** Shared by `WorldDestinationMarkers.tsx` and `WorldPoiList.tsx` — one category -> i18n-key
 * mapping, not two hand-copied ones. Kept in its own module (not exported alongside a component)
 * so both files stay `react-refresh/only-export-components`-clean. */
export const CATEGORY_MESSAGE_KEY: Record<TourismDestinationCategory, MessageKey> = {
  lake: 'worldExploration.destination.category.lake',
  'national-park': 'worldExploration.destination.category.nationalPark',
  waterfall: 'worldExploration.destination.category.waterfall',
  'cultural-village': 'worldExploration.destination.category.culturalVillage',
};
