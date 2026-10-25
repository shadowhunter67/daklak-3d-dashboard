// Tìm ảnh Wikimedia Commons CÓ GẮN TỌA ĐỘ nằm trong ranh giới từng xã/phường (point-in-polygon), để
// xác nhận ảnh chụp ngay trong địa bàn. Chỉ lập danh sách ứng viên (reference-only) vào
// reports/research/administrative-unit-geomedia.json; KHÔNG tải ảnh vào repo.
// Tọa độ gắn trên Commons là vị trí người chụp/chủ thể do người đăng khai báo, nên vẫn cần xem ảnh.
// Chạy: node scripts/research/geosearch_unit_media.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoContains } from 'd3-geo';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const wards = JSON.parse(
  readFileSync(join(root, 'src', 'assets', 'maps', 'daklak', 'daklak-wards-render.json'), 'utf8'),
);
const labels = JSON.parse(
  readFileSync(join(root, 'src', 'assets', 'maps', 'daklak', 'daklak-labels.json'), 'utf8'),
);
const FREE = /^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain|PD)/i;
const UA = { 'User-Agent': 'daklak-3d-dashboard-research/1.0 (contact: repo owner)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) =>
  (h ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const NOISE = /(seal|logo|flag|map|locator|\.svg|\.png|\.pdf|\.tif)/i;

async function api(params) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const r = await fetch(
        `https://commons.wikimedia.org/w/api.php?${new URLSearchParams(params)}`,
        {
          headers: UA,
        },
      );
      if (r.ok) return await r.json();
    } catch {
      /* thử lại */
    }
    await sleep(3000 * (attempt + 1));
  }
  return null;
}

const rows = [];
for (const feature of wards.features) {
  const { code, name } = feature.properties;
  const label = labels[code];
  const centre = label ? [label.longitude, label.latitude] : null;
  const row = { code, unit: name, candidates: [] };
  if (!centre) {
    rows.push({ ...row, status: 'no-centre' });
    continue;
  }
  const geo = await api({
    action: 'query',
    format: 'json',
    list: 'geosearch',
    gscoord: `${centre[1]}|${centre[0]}`,
    gsradius: '10000',
    gslimit: '100',
    gsnamespace: '6',
    gsprimary: 'all',
  });
  const hits = (geo?.query?.geosearch ?? []).filter(
    (h) => !NOISE.test(h.title) && geoContains(feature, [h.lon, h.lat]),
  );
  if (hits.length) {
    const info = await api({
      action: 'query',
      format: 'json',
      titles: hits
        .slice(0, 20)
        .map((h) => h.title)
        .join('|'),
      prop: 'imageinfo',
      iiprop: 'url|mime|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription',
    });
    for (const page of Object.values(info?.query?.pages ?? {})) {
      const ii = page.imageinfo?.[0];
      if (!ii || !/^image\/(jpeg|webp)/.test(ii.mime ?? '')) continue;
      const license = strip(ii.extmetadata?.LicenseShortName?.value);
      if (!FREE.test(license)) continue;
      const hit = hits.find((h) => h.title === page.title);
      row.candidates.push({
        title: page.title,
        sourceUrl: ii.descriptionurl,
        license,
        author: strip(ii.extmetadata?.Artist?.value).slice(0, 100),
        description: strip(ii.extmetadata?.ImageDescription?.value).slice(0, 140),
        lat: hit?.lat,
        lon: hit?.lon,
      });
    }
  }
  row.status = row.candidates.length ? 'candidates' : 'none';
  rows.push(row);
  await sleep(1200);
}
const out = {
  retrievedAt: new Date().toISOString(),
  method:
    'Commons geosearch bán kính 10 km quanh tâm nhãn + point-in-polygon trong ranh giới đơn vị + license tự do',
  rows,
};
writeFileSync(
  join(root, 'reports', 'research', 'administrative-unit-geomedia.json'),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    units: rows.length,
    withCandidates: rows.filter((r) => r.status === 'candidates').length,
    candidates: rows.reduce((n, r) => n + r.candidates.length, 0),
  }),
);
