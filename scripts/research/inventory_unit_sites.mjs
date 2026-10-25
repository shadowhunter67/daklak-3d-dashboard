// Kiểm kê ảnh trên trang thành phần của 102 xã/phường (<mã>.daklak.gov.vn) từ danh mục chính thức
// https://daklak.gov.vn/ubnd-cac-xa-phuong. CHỈ lập danh sách ứng viên (URL trang, URL ảnh, kích thước
// khai báo, dòng ghi nguồn nếu có) vào reports/research/unit-site-image-inventory.json; KHÔNG tải ảnh
// vào repo. Tôn trọng robots.txt (bỏ qua đường dẫn bị Disallow), giãn cách 1,5 giây giữa các yêu cầu.
// Chạy: node scripts/research/inventory_unit_sites.mjs <file-ubnd-cac-xa-phuong.html>
import { readFileSync, writeFileSync } from 'node:fs';
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
    .replace(/[^a-z0-9]/g, '');
const byFolded = new Map(Object.entries(labels).map(([code, l]) => [fold(l.name), code]));

const listHtml = readFileSync(process.argv[2], 'utf8');
const sites = new Map();
for (const m of listHtml.matchAll(/https?:\/\/([a-z0-9]+)\.daklak\.gov\.vn[^"'\s<>]*/gi)) {
  const sub = m[1].toLowerCase();
  if (['www', 'daklak', 'mail', 'dichvucong'].includes(sub)) continue;
  if (!sites.has(sub)) sites.set(sub, m[0]);
}
const UA = 'Mozilla/5.0 (compatible; daklak-3d-dashboard-research/1.0; inventory only)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const abs = (base, u) => {
  try {
    return new URL(u, base).toString();
  } catch {
    return undefined;
  }
};
const attrRe = /(ảnh|photo|nguồn|source)\s*[:：]\s*([^<\n]{2,60})/i;

const rows = [];
for (const [sub, url] of sites) {
  const code = byFolded.get(sub) ?? [...byFolded].find(([k]) => k === sub)?.[1];
  const row = { code: code ?? null, subdomain: sub, url, images: [] };
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    row.status = res.status;
    if (res.ok) {
      const html = await res.text();
      const base = res.url;
      const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(
        html,
      )?.[1];
      if (og) row.ogImage = abs(base, og);
      const seen = new Set();
      for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
        const tag = m[0];
        const src = /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1];
        const full = src && abs(base, src);
        if (!full || seen.has(full) || /\.(svg|gif)(\?|$)/i.test(full)) continue;
        if (/(logo|icon|banner|bg|background|avatar|flag|qrcode|sprite|loading)/i.test(full))
          continue;
        seen.add(full);
        row.images.push({
          src: full,
          alt: /\balt=["']([^"']*)["']/i.exec(tag)?.[1] ?? '',
          width: /\bwidth=["']?(\d+)/i.exec(tag)?.[1],
        });
        if (row.images.length >= 12) break;
      }
      const credit = attrRe.exec(html.replace(/\s+/g, ' '));
      if (credit) row.creditLine = credit[0].trim();
      row.title = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim();
    }
  } catch (error) {
    row.error = String(error).slice(0, 120);
  }
  rows.push(row);
  await sleep(1500);
}
const out = {
  retrievedAt: new Date().toISOString(),
  listSource: 'https://daklak.gov.vn/ubnd-cac-xa-phuong',
  note: 'Chỉ kiểm kê; chưa tải ảnh, chưa kiểm quyền. Xem reports/research/administrative-unit-media-decisions.md.',
  units: rows,
};
writeFileSync(
  join(root, 'reports', 'research', 'unit-site-image-inventory.json'),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    sites: rows.length,
    reachable: rows.filter((r) => r.status === 200).length,
    withImages: rows.filter((r) => r.images.length).length,
    unmatchedCodes: rows.filter((r) => !r.code).length,
  }),
);
