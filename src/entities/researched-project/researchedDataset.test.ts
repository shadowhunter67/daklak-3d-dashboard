import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { validateResearchedDataset } from './validate';
import type { ResearchedDataset } from './types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dataset = JSON.parse(
  gunzipSync(readFileSync(join(root, 'public', 'data', 'researched-projects.json.gz'))).toString(
    'utf8',
  ),
) as ResearchedDataset;
const labels = JSON.parse(
  readFileSync(join(root, 'src', 'assets', 'maps', 'daklak', 'daklak-labels.json'), 'utf8'),
) as Record<string, { longitude: number; latitude: number }>;

describe('bộ dữ liệu dự án thật (QĐ 1985/QĐ-UBND)', () => {
  it('qua toàn bộ validator, không có lỗi (cảnh báo được phép)', () => {
    const issues = validateResearchedDataset(dataset, {
      validAdministrativeCodes: new Set(Object.keys(labels)),
      now: '2026-10-18T00:00:00.000Z',
    });
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('có ≥ 30 dự án và tất cả đều ở giai đoạn thu hút đầu tư, không bị gọi là "đang triển khai"', () => {
    expect(dataset.projects.length).toBeGreaterThanOrEqual(30);
    expect(new Set(dataset.projects.map((p) => p.lifecycle.value))).toEqual(
      new Set(['investment-attraction']),
    );
  });

  it('không bịa: không dự án nào có tiến độ/giải ngân/nhà đầu tư, và không có mức "verified"', () => {
    for (const p of dataset.projects) {
      expect(p.fields.progress).toBeUndefined();
      expect(p.fields.disbursement).toBeUndefined();
      expect(p.fields.investor).toBeUndefined();
      expect(p.verification).not.toBe('verified');
    }
  });

  it('vị trí chỉ là tâm đơn vị hành chính và trùng đúng toạ độ nhãn của đơn vị đó', () => {
    const withLocation = dataset.projects.filter((p) => p.location);
    expect(withLocation.length).toBeGreaterThan(0);
    for (const p of withLocation) {
      expect(p.location?.accuracy).toBe('administrative-centroid');
      expect(p.administrativeAreaCodes).toHaveLength(1);
      const label = labels[p.administrativeAreaCodes[0]];
      expect(p.location?.coordinates).toEqual([label.longitude, label.latitude]);
    }
  });

  it('mỗi nguồn có checksum và số hiệu văn bản; PL3 (trùng PL2 ở nguồn) không có mặt', () => {
    expect(dataset.sources.map((s) => s.id)).not.toContain('src-qd1985-pl3');
    for (const s of dataset.sources) {
      expect(s.checksum).toMatch(/^md5:[0-9a-f]{32}$/);
      expect(s.documentNumber).toBe('1985/QĐ-UBND');
    }
  });

  it('vốn là số nguyên VND không âm', () => {
    for (const p of dataset.projects) {
      const v = p.fields.totalInvestment?.[0].value as number;
      expect(Number.isInteger(v) && v >= 0).toBe(true);
    }
  });
});
