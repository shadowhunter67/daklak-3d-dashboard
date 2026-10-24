// Trích số hiệu văn bản quy hoạch từ cột `quyet_dinh_quy_hoach` của danh mục QĐ 1985/QĐ-UBND
// (docs/data-sources/evidence/1985-qd-ubnd/1985-danh-muc-du-an.json) → src/data/planningCitations.ts.
// Chỉ ghi những gì văn bản nguồn nêu: số hiệu, cơ quan ban hành (suy từ hậu tố số hiệu), ngày nếu nằm
// ngay sau số hiệu. KHÔNG kết luận phù hợp/không phù hợp quy hoạch. Chạy: node scripts/research/extract_planning_citations.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rows = JSON.parse(
  readFileSync(
    join(root, 'docs/data-sources/evidence/1985-qd-ubnd/1985-danh-muc-du-an.json'),
    'utf8',
  ),
);

const NUMBER =
  /(\d{1,5}\s?\/\s?(?:[A-ZĐ]{1,4})(?:\s?-\s?[A-Za-zĐ]{2,6})+)(?:\s*ngày\s+(\d{1,2})\/(\d{1,2})\/(\d{4}))?/g;
const GAP = /chưa có quy hoạch|:\s*chưa có|\(chưa đủ\)|chưa có nghị quyết/i;

const issuerOf = (number) => {
  if (/TTg$/i.test(number)) return 'prime-minister';
  if (/-HĐND$/i.test(number)) return 'provincial-council';
  if (/UBND$/i.test(number)) return 'people-committee';
  if (/-B[A-Z]{1,3}$/i.test(number)) return 'ministry';
  return 'unknown';
};
const normalize = (n) => n.replace(/\s+/g, '').replace(/\/QD-/i, '/QĐ-').replace(/DQQ/, 'QĐ');
const iso = (d, m, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

const docs = new Map();
const review = [];
const withoutCitation = [];
for (const row of rows) {
  const id = `qd1985-${row.phu_luc.toLowerCase()}-${String(row.stt).padStart(3, '0')}`;
  const text = (row.quyet_dinh_quy_hoach ?? '').trim();
  if (!text) {
    withoutCitation.push(id);
    continue;
  }
  const seen = new Set();
  for (const match of text.matchAll(NUMBER)) {
    const number = normalize(match[1]);
    if (seen.has(number)) continue;
    seen.add(number);
    const entry = docs.get(number) ?? { number, issuer: issuerOf(number), projectIds: [] };
    if (match[4] && !entry.date) entry.date = iso(match[2], match[3], match[4]);
    entry.projectIds.push(id);
    docs.set(number, entry);
  }
  if (seen.size === 0) withoutCitation.push(id);
  if (GAP.test(text)) review.push(id);
}

const documents = [...docs.values()].sort(
  (a, b) => b.projectIds.length - a.projectIds.length || a.number.localeCompare(b.number),
);
// Mã gọn của dự án: phụ lục × 1000 + số thứ tự (PL2 #15 → 2015) để giữ gói JS nhỏ; giải mã ở runtime.
const code = (id) => {
  const [, appendix, stt] = /^qd1985-pl(\d)-(\d{3})$/.exec(id);
  return Number(appendix) * 1000 + Number(stt);
};
const compact = documents.map((d) => ({ ...d, projectIds: d.projectIds.map(code) }));
const out = `/**
 * SINH TỰ ĐỘNG bởi scripts/research/extract_planning_citations.mjs — đừng sửa tay.
 * Nguồn: cột "quyết định quy hoạch" của danh mục kèm Quyết định 1985/QĐ-UBND (bản lưu trong
 * docs/data-sources/evidence/1985-qd-ubnd/). Đây là các văn bản được TRÍCH DẪN trong danh mục, không
 * phải kết luận pháp lý về mức độ phù hợp quy hoạch của từng dự án. Cơ quan ban hành suy từ hậu tố số
 * hiệu; ngày chỉ có khi nằm ngay sau số hiệu trong nguồn.
 */
export type PlanningIssuer =
  'prime-minister' | 'ministry' | 'people-committee' | 'provincial-council' | 'unknown';

export interface PlanningDocument {
  number: string;
  issuer: PlanningIssuer;
  /** ISO yyyy-mm-dd; vắng nghĩa là nguồn không nêu ngày ngay sau số hiệu. */
  date?: string;
  /** Id dự án trong researched-projects (qd1985-pl<N>-<stt>) có trích dẫn văn bản này. */
  projectIds: string[];
}

const decode = (n: number) => \`qd1985-pl\${Math.floor(n / 1000)}-\${String(n % 1000).padStart(3, '0')}\`;
const RAW: readonly { number: string; issuer: PlanningIssuer; date?: string; projectIds: number[] }[] = ${JSON.stringify(compact)};
const REVIEW_RAW: readonly number[] = ${JSON.stringify(review.map(code))};
const UNCITED_RAW: readonly number[] = ${JSON.stringify(withoutCitation.map(code))};

export const PLANNING_TOTAL_PROJECTS = ${rows.length};
export const PLANNING_DOCUMENTS: readonly PlanningDocument[] = RAW.map((d) => ({
  ...d,
  projectIds: d.projectIds.map(decode),
}));
/** Dự án có ô quy hoạch tự nêu còn thiếu/chưa có (ví dụ "chưa có quy hoạch phân khu") — cần rà soát. */
export const PLANNING_REVIEW_PROJECT_IDS: readonly string[] = REVIEW_RAW.map(decode);
/** Dự án không trích số hiệu văn bản quy hoạch nào trong ô nguồn. */
export const PLANNING_UNCITED_PROJECT_IDS: readonly string[] = UNCITED_RAW.map(decode);
`;
writeFileSync(join(root, 'src/data/planningCitations.ts'), out);
console.log(
  JSON.stringify({
    projects: rows.length,
    documents: documents.length,
    review: review.length,
    uncited: withoutCitation.length,
  }),
);
