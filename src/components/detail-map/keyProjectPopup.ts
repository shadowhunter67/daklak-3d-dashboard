import {
  KEY_PROJECT_CATEGORY_LABEL,
  KEY_PROJECT_STATUS_COLOR,
  KEY_PROJECT_STATUS_LABEL,
  type KeyProjectCategory,
  type KeyProjectStatus,
} from './keyProjects';

/** Minimal HTML-escape for text interpolated into the MapLibre popup markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface RawProps {
  name?: unknown;
  category?: unknown;
  status?: unknown;
  summary?: unknown;
  sourceUrl?: unknown;
  sourceLabel?: unknown;
  sourceDate?: unknown;
  geom?: unknown;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Popup markup for a clicked key-project feature. Vietnamese-only (the data is), and every text
 * field is HTML-escaped; the source link is `rel="noopener noreferrer" target="_blank"`. Ends
 * with a geometry caveat — the OSM-derived corridors (`geom: 'osm'`) get an ODbL note, everything
 * else the hand-placed "approximate, not field-verified" note.
 */
export function keyProjectPopupHtml(props: RawProps): string {
  const name = escapeHtml(str(props.name));
  const category = KEY_PROJECT_CATEGORY_LABEL[str(props.category) as KeyProjectCategory] ?? '';
  const statusKey = str(props.status) as KeyProjectStatus;
  const statusLabel = KEY_PROJECT_STATUS_LABEL[statusKey] ?? '';
  const statusColor = KEY_PROJECT_STATUS_COLOR[statusKey] ?? '#c9c9c9';
  const summary = escapeHtml(str(props.summary));
  const sourceUrl = str(props.sourceUrl);
  const sourceLabel = escapeHtml(str(props.sourceLabel) || 'Nguồn');
  const sourceDate = escapeHtml(str(props.sourceDate));
  const safeHref = /^https:\/\//.test(sourceUrl) ? escapeHtml(sourceUrl) : '';
  const caveat =
    str(props.geom) === 'osm'
      ? 'Tuyến sơ đồ hoá từ OpenStreetMap (© OpenStreetMap contributors, ODbL).'
      : 'Vị trí/tuyến gần đúng — chưa kiểm chứng thực địa.';

  return [
    `<div class="key-project-popup">`,
    `<strong class="key-project-popup__name">${name}</strong>`,
    category ? `<div class="key-project-popup__cat">${escapeHtml(category)}</div>` : '',
    `<div class="key-project-popup__status"><span class="key-project-popup__dot" style="background:${statusColor}"></span>${escapeHtml(
      statusLabel,
    )}</div>`,
    summary ? `<p class="key-project-popup__summary">${summary}</p>` : '',
    safeHref
      ? `<a class="key-project-popup__source" href="${safeHref}" target="_blank" rel="noopener noreferrer">Nguồn: ${sourceLabel}${
          sourceDate ? ` (${sourceDate})` : ''
        }</a>`
      : '',
    `<p class="key-project-popup__caveat">${escapeHtml(caveat)}</p>`,
    `</div>`,
  ].join('');
}
