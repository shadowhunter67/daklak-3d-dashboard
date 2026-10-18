// Dựng bộ dữ liệu "dự án đã nghiên cứu" từ bằng chứng Quyết định 1985/QĐ-UBND (24/06/2026) đã được
// trích xuất trong docs/data-sources/evidence/1985-qd-ubnd/. Tất định: cùng đầu vào → cùng đầu ra.
// KHÔNG suy diễn: trường không có trong nguồn thì bỏ trống; địa danh không khớp chính xác tên đơn
// vị hành chính thì không gán mã, chỉ ghi chú. Chạy: node scripts/research/build_researched_projects.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const evidenceDir = join(root, 'docs', 'data-sources', 'evidence', '1985-qd-ubnd');
const labels = JSON.parse(
  readFileSync(join(root, 'src', 'assets', 'maps', 'daklak', 'daklak-labels.json'), 'utf8'),
);
const rows = JSON.parse(readFileSync(join(evidenceDir, '1985-danh-muc-du-an.json'), 'utf8'));

const DECISION_DATE = '2026-06-24T00:00:00.000Z';
const RETRIEVED_AT = '2026-09-29T00:00:00.000Z';
const PDF_BASE = 'https://vpubnd.daklak.gov.vn/CMS/Content/VanBan/2026/6.2026/';
// MD5 ghi trong README của thư mục bằng chứng (tải 2026-09-29). PL3 trùng byte PL2 ở nguồn → thiếu.
const APPENDICES = {
  PL1: ['Năng lượng', 'b4f5a2d5a465c38f876c70f38b9dfdaa'],
  PL2: ['Đô thị, nhà ở', '549cca3d08860743be13a0d0db098f52'],
  PL4: [
    'Nông nghiệp, công nghiệp chế biến, thương mại dịch vụ',
    'cd3f63d01afcb6e2c2ce74dcdfb1f9f7',
  ],
  PL5: ['Y tế, giáo dục, môi trường, công nghệ thông tin', '0b986e88b325784603ff024412e2215a'],
  PL6: ['Du lịch, sân golf - thể thao', '014d5587c666332751ff4e080cfff8ef'],
};
// Viết tắt trong chính văn bản nguồn; đây là bảng alias duy nhất được phép.
const ALIASES = { bmt: 'buonmathuot' };

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const key = (s) => fold(s).replace(/[^a-z0-9]/g, '');

const codeByKey = new Map(Object.entries(labels).map(([code, v]) => [key(v.name), code]));

/** "3.400" → 3400; "1.234,5" → 1234.5 (định dạng số Việt Nam). */
function parseViNumber(text) {
  const cleaned = text.trim().replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

const PREFIX = /^(?:(?:tai|cac|xa|phuong|thi tran)\s+)+/;

function resolveLocation(text) {
  const tokens = text
    .split(/[,;:\n]|\s+và\s+|\s-\s/i)
    .map((t) => t.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  const codes = new Set();
  const unmatched = [];
  for (const token of tokens) {
    if (token.includes('(')) {
      unmatched.push(token);
      continue;
    }
    const name = key(fold(token).replace(PREFIX, ''));
    const code = codeByKey.get(ALIASES[name] ?? name);
    if (code) codes.add(code);
    else unmatched.push(token);
  }
  return { codes: [...codes].sort(), unmatched };
}

const SECTOR = (r) => {
  const n = fold(r.nhom);
  if (r.phu_luc === 'PL1') return 'energy';
  if (r.phu_luc === 'PL2') return n.includes('khu do thi') ? 'urban' : 'housing';
  if (r.phu_luc === 'PL6') return 'tourism';
  if (r.phu_luc === 'PL5') {
    if (n.includes('y te')) return 'health';
    if (n.includes('giao duc')) return 'education';
    if (n.includes('moi truong')) return 'environment';
    return 'digital-government';
  }
  if (n.includes('nong nghiep')) return 'agriculture';
  if (n.includes('cong nghiep')) return 'industrial';
  return 'other';
};

const obs = (value, sourceId) => ({
  value,
  sourceId,
  observedAt: DECISION_DATE,
  confidence: 'high',
  status: 'official',
});

const sources = Object.entries(APPENDICES).map(([pl, [title, md5]]) => ({
  id: `src-qd1985-${pl.toLowerCase()}`,
  title: `Quyết định 1985/QĐ-UBND — Phụ lục ${pl.slice(2)}: ${title}`,
  organization: 'UBND tỉnh Đắk Lắk',
  url: `${PDF_BASE}1985-Q%C4%90-UBND%20${pl}.pdf`,
  documentNumber: '1985/QĐ-UBND',
  sourceType: 'official-legal-document',
  publishedAt: DECISION_DATE,
  retrievedAt: RETRIEVED_AT,
  jurisdiction: 'Tỉnh Đắk Lắk',
  checksum: `md5:${md5}`,
  knownLimitations:
    'Danh mục thu hút đầu tư giai đoạn 2026-2030: số vốn là DỰ KIẾN, dự án chưa có chủ trương đầu tư/nhà đầu tư. Bản trích bảng PDF bằng PyMuPDF, đã đối chiếu số dòng theo nhóm.',
  usageNotes:
    'Văn bản hành chính công khai của cơ quan nhà nước; ghi rõ nguồn khi trích dẫn. Chính sách tái phân phối riêng của tên miền vpubnd.daklak.gov.vn chưa được xác nhận — cần owner duyệt trước khi coi là cho phép tái xuất bản diện rộng.',
}));

const projects = [];
const skipped = [];
const sums = new Map();
for (const r of rows) {
  const name = r.ten_du_an.trim().replace(/\s+/g, ' ');
  const capital = parseViNumber(r.tong_von_ty);
  const id = `qd1985-${r.phu_luc.toLowerCase()}-${String(r.stt).padStart(3, '0')}`;
  const sourceId = `src-qd1985-${r.phu_luc.toLowerCase()}`;
  if (!name || capital === undefined) {
    skipped.push({ id, name, reason: 'Tên hoặc tổng vốn không đọc được từ bảng nguồn' });
    continue;
  }
  sums.set(r.nhom, (sums.get(r.nhom) ?? 0) + capital);

  const { codes, unmatched } = resolveLocation(r.dia_diem);
  const notes = [];
  if (unmatched.length)
    notes.push(`Địa danh chưa khớp đơn vị hành chính (không gán mã): ${unmatched.join('; ')}`);
  const project = {
    id,
    name,
    lifecycle: obs('investment-attraction', sourceId),
    sector: SECTOR(r),
    administrativeAreaCodes: codes,
    fields: { totalInvestment: [obs(Math.round(capital * 1e9), sourceId)] },
    verification: 'partial',
  };
  if (codes.length === 1) {
    const l = labels[codes[0]];
    project.location = {
      coordinates: [l.longitude, l.latitude],
      accuracy: 'administrative-centroid',
      sourceId,
      verificationMethods: ['administrative-centroid'],
      note: 'Tâm đơn vị hành chính; nguồn không cung cấp toạ độ dự án.',
    };
  }
  if (notes.length) project.notes = notes;
  projects.push(project);
}

const dataset = {
  schemaVersion: 1,
  generatedAt: RETRIEVED_AT,
  sources,
  projects,
};

// Đối chiếu tổng vốn từng nhóm với con số ghi trên tiêu đề nhóm của chính văn bản.
const reconcile = [];
for (const [nhom, sum] of sums) {
  const m = nhom.match(/([\d.]+)\s*TỶ/i);
  const stated = m ? parseViNumber(m[1]) : undefined;
  reconcile.push({
    nhom,
    extracted: sum,
    stated,
    matches: stated === undefined ? null : stated === sum,
  });
}

const outDir = join(root, 'reports', 'research');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'researched-projects.json'), `${JSON.stringify(dataset, null, 2)}\n`);
mkdirSync(join(root, 'public', 'data'), { recursive: true });
writeFileSync(
  join(root, 'public', 'data', 'researched-projects.json.gz'),
  gzipSync(Buffer.from(JSON.stringify(dataset)), { level: 9, mtime: 0 }),
);

const withCode = projects.filter((p) => p.administrativeAreaCodes.length > 0).length;
const withLocation = projects.filter((p) => p.location).length;
const summary = {
  inputRows: rows.length,
  projects: projects.length,
  skipped,
  withAdminCode: withCode,
  withCentroidLocation: withLocation,
  withUnresolvedLocationNotes: projects.filter((p) => p.notes).length,
  reconcile,
};
writeFileSync(join(outDir, 'build-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      ...summary,
      reconcile: reconcile.map(
        (r) =>
          `${r.matches === true ? 'OK ' : r.matches === false ? 'DIFF' : '?  '} ${r.extracted} vs ${r.stated} ${r.nhom.slice(0, 40)}`,
      ),
    },
    null,
    1,
  ),
);
