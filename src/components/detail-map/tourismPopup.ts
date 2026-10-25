import { escapeHtml } from './keyProjectPopup';

const CATEGORY_LABEL: Record<string, string> = {
  lake: 'Hồ',
  'national-park': 'Vườn quốc gia',
  waterfall: 'Thác nước',
  'cultural-village': 'Làng văn hóa',
  'heritage-structure': 'Công trình / di tích',
  'natural-landmark': 'Danh thắng thiên nhiên',
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Popup cho một điểm đến du lịch: chỉ tên, loại hình và nguồn — không có số liệu chưa có nguồn. */
export function tourismPopupHtml(props: {
  name?: unknown;
  category?: unknown;
  sourceUrl?: unknown;
}): string {
  const name = escapeHtml(str(props.name));
  const category = escapeHtml(CATEGORY_LABEL[str(props.category)] ?? '');
  const sourceUrl = str(props.sourceUrl);
  const safeHref = /^https:\/\//.test(sourceUrl) ? escapeHtml(sourceUrl) : '';
  const source = safeHref
    ? `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">Nguồn thông tin</a>`
    : '';
  return `<div class="detail-map-callout__body"><strong>${name}</strong><p>${category}</p><p>Tọa độ đối chiếu Wikipedia/Wikidata. Chưa có số liệu lượt khách.</p>${source}</div>`;
}
