// Tìm ứng viên ảnh Wikimedia Commons cho 102 xã/phường. KHÔNG tải ảnh, KHÔNG đưa gì vào production:
// mọi ứng viên chỉ ghi ở reports/research/administrative-unit-media.{json,csv} với usage
// 'reference-only' (hoặc 'rejected' nếu license không dùng lại được). Một ảnh chỉ được coi là ứng viên
// khi tên đơn vị xuất hiện trong tiêu đề/mô tả/danh mục của chính Commons (khớp gần đúng không đủ) và
// có license tự do. Chạy: node scripts/research/search_commons_units.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const labels = JSON.parse(
  readFileSync(join(root, 'src', 'assets', 'maps', 'daklak', 'daklak-labels.json'), 'utf8'),
);
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const FREE = /^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain|PD)/i;
const PROVINCE_HINT =
  /(dak lak|daklak|dak nong|phu yen|buon ma thuot|ban me thuot|tay nguyen|central highlands)/;
const strip = (html) =>
  (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function search(name) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${name} Đắk Lắk`,
    gsrnamespace: '6',
    gsrlimit: '6',
    prop: 'imageinfo|categories',
    iiprop: 'url|mime|extmetadata',
    iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription|DateTimeOriginal',
    cllimit: '20',
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'daklak-3d-dashboard-research/1.0 (contact: repo owner)' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  return Object.values(json.query?.pages ?? {});
}

const rows = [];
let failures = 0;
for (const [code, unit] of Object.entries(labels)) {
  const needle = fold(unit.name);
  let pages = [];
  try {
    // Thử lại có giãn cách khi bị giới hạn tốc độ (HTTP 429/5xx); không bỏ sót đơn vị nào.
    let lastError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        pages = await search(unit.name);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      }
    }
    if (lastError) throw lastError;
  } catch (error) {
    failures += 1;
    rows.push({ code, unit: unit.name, status: 'search-failed', note: String(error) });
    await new Promise((r) => setTimeout(r, 2000));
    continue;
  }
  const candidates = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)/.test(info.mime ?? '')) continue;
    const meta = info.extmetadata ?? {};
    const license = strip(meta.LicenseShortName?.value);
    const description = strip(meta.ImageDescription?.value);
    const categories = (page.categories ?? []).map((c) => c.title).join(' ');
    const haystack = fold(`${page.title} ${description} ${categories}`);
    const nameInText = new RegExp(`(^| )${needle}( |$)`).test(haystack);
    if (!nameInText || !PROVINCE_HINT.test(haystack)) continue;
    candidates.push({
      title: page.title,
      sourceUrl:
        info.descriptionurl ??
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      license,
      licenseFree: FREE.test(license),
      author: strip(meta.Artist?.value).slice(0, 120),
      description: description.slice(0, 160),
    });
  }
  rows.push({
    code,
    unit: unit.name,
    status: candidates.length ? 'candidates' : 'none-found',
    candidates,
  });
  await new Promise((r) => setTimeout(r, 2500));
}

const outDir = join(root, 'reports', 'research');
mkdirSync(outDir, { recursive: true });
const retrievedAt = new Date().toISOString();
writeFileSync(
  join(outDir, 'administrative-unit-media.json'),
  `${JSON.stringify({ retrievedAt, method: 'Commons API generator=search, tên đơn vị phải có trong tiêu đề/mô tả/danh mục và có gợi ý tỉnh', note: 'Ứng viên chỉ-tham-chiếu: chưa tải ảnh, chưa xác minh chủ thể bằng mắt, KHÔNG dùng production.', rows }, null, 2)}\n`,
);
const csv = [
  'code,unit,status,candidate_count,free_license_count,first_candidate_url,first_license',
];
for (const r of rows) {
  const free = (r.candidates ?? []).filter((c) => c.licenseFree);
  const first = free[0] ?? r.candidates?.[0];
  csv.push(
    [
      r.code,
      `"${r.unit}"`,
      r.status,
      r.candidates?.length ?? 0,
      free.length,
      first?.sourceUrl ?? '',
      `"${first?.license ?? ''}"`,
    ].join(','),
  );
}
writeFileSync(join(outDir, 'administrative-unit-media.csv'), `${csv.join('\n')}\n`);
const withCandidates = rows.filter((r) => r.status === 'candidates').length;
const withFree = rows.filter((r) => (r.candidates ?? []).some((c) => c.licenseFree)).length;
console.log(
  JSON.stringify({
    units: rows.length,
    withCandidates,
    withFreeLicenseCandidate: withFree,
    failures,
  }),
);
