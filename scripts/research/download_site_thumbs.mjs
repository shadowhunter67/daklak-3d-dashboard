// Tải tối đa N ảnh đầu của mỗi trang xã/phường (theo unit-site-image-inventory.json) vào thư mục TẠM để
// xem bằng mắt. Không đụng public/ hay src/. Chạy:
//   node scripts/research/download_site_thumbs.mjs <thư-mục-đích> [N=4]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = process.argv[2];
const perSite = Number(process.argv[3] ?? 4);
if (!out) throw new Error('Thiếu thư mục đích');
mkdirSync(out, { recursive: true });
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const inv = JSON.parse(
  readFileSync(join(root, 'reports', 'research', 'unit-site-image-inventory.json'), 'utf8'),
);
const UA = 'Mozilla/5.0 (compatible; daklak-3d-dashboard-research/1.0; review only)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const manifest = [];
for (const u of inv.units) {
  if (!u.code || !u.images.length) continue;
  const list = u.images.filter((i) => /\.(jpe?g|png|webp)(\?|$)/i.test(i.src)).slice(0, perSite);
  let n = 0;
  for (const img of list) {
    n += 1;
    try {
      const r = await fetch(img.src, { headers: { 'User-Agent': UA, Referer: u.url } });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 8000) continue;
      const file = `${u.code}_${n}.img`;
      writeFileSync(join(out, file), buf);
      manifest.push({ code: u.code, sub: u.subdomain, n, file, src: img.src, bytes: buf.length });
    } catch {
      /* bỏ qua ảnh lỗi */
    }
    await sleep(800);
  }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ files: manifest.length }));
