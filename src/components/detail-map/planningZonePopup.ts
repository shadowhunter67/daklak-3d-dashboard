import { escapeHtml } from './keyProjectPopup';

interface RawProps {
  name?: unknown;
  kind?: unknown;
  summary?: unknown;
  sourceUrl?: unknown;
  sourceLabel?: unknown;
  sourceDate?: unknown;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Popup markup for a clicked planning-zone feature — same escaping/link-safety rules as
 * `keyProjectPopup.ts`, plus the schematic-boundary caveat (these are NOT cadastral shapes). */
export function planningZonePopupHtml(props: RawProps): string {
  const name = escapeHtml(str(props.name));
  const kind = escapeHtml(str(props.kind));
  const summary = escapeHtml(str(props.summary));
  const sourceUrl = str(props.sourceUrl);
  const sourceLabel = escapeHtml(str(props.sourceLabel) || 'Nguồn');
  const sourceDate = escapeHtml(str(props.sourceDate));
  const safeHref = /^https:\/\//.test(sourceUrl) ? escapeHtml(sourceUrl) : '';

  return [
    `<div class="key-project-popup">`,
    `<strong class="key-project-popup__name">${name}</strong>`,
    kind ? `<div class="key-project-popup__cat">${kind}</div>` : '',
    summary ? `<p class="key-project-popup__summary">${summary}</p>` : '',
    safeHref
      ? `<a class="key-project-popup__source" href="${safeHref}" target="_blank" rel="noopener noreferrer">Nguồn: ${sourceLabel}${
          sourceDate ? ` (${sourceDate})` : ''
        }</a>`
      : '',
    `<p class="key-project-popup__caveat">Ranh giới minh họa theo mô tả công bố — không phải ranh địa chính, chưa kiểm chứng thực địa.</p>`,
    `</div>`,
  ].join('');
}
