import type { MessageKey } from '../i18n/messages';
import type { UnitProfile } from './unitProfiles';

type Translate = (key: MessageKey) => string;

/** "1 thôn · 7 buôn" — only kinds with a count above zero, in a fixed order. */
export function formatSubUnits(profile: UnitProfile, t: Translate): string {
  const parts: Array<[number, MessageKey]> = [
    [profile.villages, 'detailPanel.villages'],
    [profile.buon, 'detailPanel.buon'],
    [profile.residentialGroups, 'detailPanel.residentialGroups'],
    [profile.neighbourhoods, 'detailPanel.neighbourhoods'],
  ];
  return parts
    .filter(([count]) => count > 0)
    .map(([count, key]) => `${count} ${t(key)}`)
    .join(' · ');
}
