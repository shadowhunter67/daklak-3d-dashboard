// Tải bản thu nhỏ (480px) của ứng viên ảnh có tọa độ cho các đơn vị CHƯA có ảnh, vào thư mục tạm, để xem
// bằng mắt. Không đụng public/ hay src/. Chạy:
//   node scripts/research/download_geomedia_thumbs.mjs <thư-mục-đích> <file-mã-đơn-vị-đã-có-ảnh.json>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [out, haveFile] = process.argv.slice(2);
if (!out || !haveFile) throw new Error('Thiếu tham số');
mkdirSync(out, { recursive: true });
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const have = new Set(JSON.parse(readFileSync(haveFile, 'utf8')));
const data = JSON.parse(
  readFileSync(join(root, 'reports', 'research', 'administrative-unit-geomedia.json'), 'utf8'),
);
const UA = { 'User-Agent': 'daklak-3d-dashboard-research/1.0 (contact: repo owner)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const manifest = [];
for (const row of data.rows) {
  if (have.has(row.code)) continue;
  let n = 0;
  for (const c of row.candidates.slice(0, 3)) {
    n += 1;
    let thumb;
    for (let attempt = 0; attempt < 4 && !thumb; attempt += 1) {
      try {
        const params = new URLSearchParams({
          action: 'query',
          format: 'json',
          titles: c.title,
          prop: 'imageinfo',
          iiprop: 'url',
          iiurlwidth: '480',
        });
        const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA });
        thumb = Object.values((await r.json()).query.pages)[0].imageinfo?.[0]?.thumburl;
      } catch {
        await sleep(3000 * (attempt + 1));
      }
    }
    let ok = false;
    for (let attempt = 0; thumb && attempt < 4 && !ok; attempt += 1) {
      const r = await fetch(thumb, { headers: UA });
      if (r.ok) {
        writeFileSync(join(out, `${row.code}_${n}.jpg`), Buffer.from(await r.arrayBuffer()));
        ok = true;
      } else await sleep(4000 * (attempt + 1));
    }
    manifest.push({
      code: row.code,
      unit: row.unit,
      n,
      title: c.title,
      license: c.license,
      author: c.author,
      description: c.description,
      ok,
    });
    await sleep(1200);
  }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ files: manifest.filter((m) => m.ok).length, total: manifest.length }));
