// Phân loại ứng viên ảnh xã/phường từ administrative-unit-media.json (không gọi mạng).
// Luật loại nhiễu: con dấu/bản đồ vị trí/logo (.png), ảnh lịch sử, ảnh chung chung của cả vùng, và
// một ảnh bị gán cho nhiều đơn vị. Phần còn lại KHÔNG tự động được chấp nhận: cần người xem ảnh để
// xác nhận đúng chủ thể (tên đơn vị trong mô tả chưa đủ) rồi mới có thể thành `production`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'reports', 'research');
const data = JSON.parse(readFileSync(join(dir, 'administrative-unit-media.json'), 'utf8'));

const NOISE = /(seal|location|map|logo|flag|taynguyen01|AP0617|ban m[eê]\.png|1933)/i;
const titleUse = new Map();
for (const row of data.rows)
  for (const c of row.candidates ?? []) titleUse.set(c.title, (titleUse.get(c.title) ?? 0) + 1);

const out = { ...data, classifiedAt: new Date().toISOString(), rows: [] };
const summary = { units: 0, withPlausible: 0, plausibleFiles: 0, noiseFiles: 0 };
const lines = [];
for (const row of data.rows) {
  summary.units += 1;
  const candidates = (row.candidates ?? []).map((c) => {
    const noise = NOISE.test(c.title) || /\.png$/i.test(c.title) || titleUse.get(c.title) > 1;
    return {
      ...c,
      assessment: !c.licenseFree
        ? 'rejected-license'
        : noise
          ? 'rejected-noise'
          : 'needs-visual-review',
      usage: c.licenseFree && !noise ? 'reference-only' : 'rejected',
    };
  });
  const plausible = candidates.filter((c) => c.assessment === 'needs-visual-review');
  summary.noiseFiles += candidates.length - plausible.length;
  summary.plausibleFiles += plausible.length;
  if (plausible.length) {
    summary.withPlausible += 1;
    lines.push(
      `| ${row.code} | ${row.unit} | ${plausible.length} | ${plausible
        .map((c) => c.title.replace('File:', ''))
        .slice(0, 2)
        .join('; ')} | ${plausible[0].license} |`,
    );
  }
  out.rows.push({ ...row, candidates });
}
writeFileSync(join(dir, 'administrative-unit-media.json'), `${JSON.stringify(out, null, 2)}\n`);

const csv = ['code,unit,assessment,usage,title,license,sourceUrl'];
for (const row of out.rows)
  for (const c of row.candidates)
    csv.push(
      [
        row.code,
        `"${row.unit}"`,
        c.assessment,
        c.usage,
        `"${c.title.replaceAll('"', "'")}"`,
        `"${c.license}"`,
        c.sourceUrl,
      ].join(','),
    );
writeFileSync(join(dir, 'administrative-unit-media.csv'), `${csv.join('\n')}\n`);

const md = `# Ứng viên ảnh xã/phường (Wikimedia Commons)

Truy vấn: ${data.retrievedAt}. Phương pháp: tên đơn vị phải có trong tiêu đề/mô tả/danh mục của Commons và có gợi ý tỉnh; license tự do (CC BY, CC BY-SA, CC0, public domain).

**Kết quả:** ${summary.units} đơn vị; ${summary.withPlausible} đơn vị có ≥ 1 ứng viên còn hợp lý (${summary.plausibleFiles} ảnh); ${summary.noiseFiles} ảnh bị loại vì nhiễu (con dấu, bản đồ vị trí, ảnh lịch sử/chung chung, hoặc cùng một ảnh gán cho nhiều đơn vị).

**Không ảnh nào được đưa vào production.** Lý do: (1) chưa ai xem ảnh để xác nhận đúng chủ thể — tên đơn vị trong mô tả không đủ (ví dụ "Easo02.JPG" là xã Ea Sô, không phải trung tâm Ea Kar; nhiều ảnh là thị trấn cũ/nơi lân cận); (2) CSP chỉ cho ảnh cùng origin nên mỗi ảnh phải tải về repo, mà ngân sách tổng dung lượng build chỉ còn dư ~27 KB.

| Mã | Đơn vị | Số ảnh | Ứng viên (tối đa 2) | License |
| --- | --- | --- | --- | --- |
${lines.join('\n')}

Việc cần người: xem từng ảnh ở bảng trên, xác nhận chủ thể đúng đơn vị hiện hành (sau sáp nhập 2025), rồi quyết định ngân sách dung lượng trước khi tải ảnh vào \`public/images/units/\` và thêm vào \`src/data/adminUnitMedia.ts\`.
`;
writeFileSync(join(dir, 'administrative-unit-media-review.md'), md);
console.log(JSON.stringify(summary));
