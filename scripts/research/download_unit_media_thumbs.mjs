// Tải bản thu nhỏ (480px) của các ứng viên ảnh xã/phường còn "needs-visual-review" để NGƯỜI/AI xem bằng
// mắt xác nhận chủ thể. Chỉ ghi vào thư mục tạm do tham số chỉ định, KHÔNG đụng public/ hay src/.
// Chạy: node scripts/research/download_unit_media_thumbs.mjs <thư-mục-đích>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = process.argv[2];
if (!out) throw new Error('Thiếu thư mục đích');
mkdirSync(out, { recursive: true });
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const data = JSON.parse(
  readFileSync(join(root, 'reports', 'research', 'administrative-unit-media.json'), 'utf8'),
);
const UA = { 'User-Agent': 'daklak-3d-dashboard-research/1.0 (contact: repo owner)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const manifest = [];
for (const row of data.rows) {
  const list = (row.candidates ?? []).filter((c) => c.assessment === 'needs-visual-review');
  let n = 0;
  for (const c of list) {
    n += 1;
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: c.title,
      prop: 'imageinfo',
      iiprop: 'url|size',
      iiurlwidth: '480',
    });
    let thumb;
    let size;
    for (let attempt = 0; attempt < 4 && !thumb; attempt += 1) {
      try {
        const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA });
        const j = await r.json();
        const info = Object.values(j.query.pages)[0].imageinfo?.[0];
        thumb = info?.thumburl;
        size = info ? `${info.width}x${info.height}` : undefined;
      } catch {
        await sleep(3000 * (attempt + 1));
      }
    }
    if (!thumb) {
      manifest.push({ code: row.code, unit: row.unit, n, title: c.title, error: 'no-thumb' });
      continue;
    }
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt += 1) {
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
      size,
      ok,
    });
    await sleep(1500);
  }
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ files: manifest.filter((m) => m.ok).length, total: manifest.length }));
