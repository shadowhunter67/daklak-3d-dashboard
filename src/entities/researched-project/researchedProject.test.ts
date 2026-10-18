import { describe, expect, it } from 'vitest';
import { resolveField } from './resolveField';
import { validateResearchedDataset } from './validate';
import type { FieldObservation, ResearchedDataset, ResearchedProject, SourceRecord } from './types';

const officialSource: SourceRecord = {
  id: 'src-official',
  title: 'Quyết định phê duyệt dự án',
  organization: 'UBND tỉnh Đắk Lắk',
  url: 'https://vpubnd.daklak.gov.vn/doc.pdf',
  sourceType: 'official-legal-document',
  retrievedAt: '2026-10-18T00:00:00.000Z',
};
const newsSource: SourceRecord = {
  id: 'src-news',
  title: 'Bài báo',
  organization: 'Báo X',
  url: 'https://example.vn/bai',
  sourceType: 'secondary-news',
  retrievedAt: '2026-10-18T00:00:00.000Z',
};

function obs<T>(
  value: T,
  sourceId: string,
  observedAt: string,
  status: FieldObservation<T>['status'],
): FieldObservation<T> {
  return { value, sourceId, observedAt, confidence: 'medium', status };
}

describe('resolveField', () => {
  it('không có quan sát → unknown, không bịa giá trị', () => {
    expect(resolveField([])).toEqual({ resolved: undefined, conflicts: [] });
  });

  it('lấy quan sát mới nhất trong cùng mức bằng chứng, giữ lịch sử', () => {
    const history = [
      obs(180, 'src-official', '2026-01-01T00:00:00.000Z', 'official'),
      obs(195, 'src-official', '2026-07-01T00:00:00.000Z', 'official'),
    ];
    const { resolved, conflicts } = resolveField(history);
    expect(resolved?.value).toBe(195);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].value).toBe(180);
  });

  it('nguồn chính thống thắng nguồn thứ cấp dù cũ hơn, và ghi nhận xung đột', () => {
    const history = [
      obs(200, 'src-news', '2026-09-01T00:00:00.000Z', 'derived'),
      obs(195, 'src-official', '2026-02-01T00:00:00.000Z', 'official'),
    ];
    const { resolved, conflicts } = resolveField(history);
    expect(resolved?.value).toBe(195);
    expect(conflicts.map((c) => c.value)).toEqual([200]);
  });

  it('giá trị trùng nhau không bị coi là xung đột', () => {
    const history = [
      obs(195, 'src-official', '2026-02-01T00:00:00.000Z', 'official'),
      obs(195, 'src-news', '2026-03-01T00:00:00.000Z', 'derived'),
    ];
    expect(resolveField(history).conflicts).toEqual([]);
  });
});

function project(overrides: Partial<ResearchedProject> = {}): ResearchedProject {
  return {
    id: 'rp-1',
    name: 'Dự án thử',
    lifecycle: obs('construction', 'src-official', '2026-07-01T00:00:00.000Z', 'official'),
    sector: 'transport',
    administrativeAreaCodes: ['24133'],
    fields: {},
    verification: 'partial',
    ...overrides,
  };
}

function dataset(projects: ResearchedProject[], extra: Partial<ResearchedDataset> = {}) {
  return {
    schemaVersion: 1,
    generatedAt: '2026-10-18T00:00:00.000Z',
    sources: [officialSource, newsSource],
    projects,
    ...extra,
  } satisfies ResearchedDataset;
}

const ctx = { validAdministrativeCodes: new Set(['24133']), now: '2026-10-18T00:00:00.000Z' };
const rules = (ds: ResearchedDataset) => validateResearchedDataset(ds, ctx).map((i) => i.rule);

describe('validateResearchedDataset', () => {
  it('dữ liệu hợp lệ → không có lỗi', () => {
    expect(validateResearchedDataset(dataset([project()]), ctx)).toEqual([]);
  });

  it('bắt ID dự án trùng', () => {
    expect(rules(dataset([project(), project()]))).toContain('duplicate-project-id');
  });

  it('bắt nguồn không tồn tại trong registry', () => {
    const p = project({
      fields: { totalInvestment: [obs(1, 'src-missing', '2026-07-01T00:00:00.000Z', 'official')] },
    });
    expect(rules(dataset([p]))).toContain('unknown-source');
  });

  it('bắt claim "official" nhưng nguồn là báo chí', () => {
    const p = project({
      fields: { totalInvestment: [obs(1, 'src-news', '2026-07-01T00:00:00.000Z', 'official')] },
    });
    expect(rules(dataset([p]))).toContain('official-claim-without-official-source');
  });

  it('bắt mã đơn vị hành chính lạ', () => {
    expect(rules(dataset([project({ administrativeAreaCodes: ['99999'] })]))).toContain(
      'unknown-admin-code',
    );
  });

  it('bắt toạ độ trung tâm xã bị đánh dấu chính xác', () => {
    const p = project({
      location: {
        coordinates: [108.0, 12.7],
        accuracy: 'verified',
        sourceId: 'src-official',
        verificationMethods: ['administrative-centroid'],
      },
    });
    expect(rules(dataset([p]))).toContain('location-accuracy-overclaimed');
  });

  it('"verified" cần ít nhất 2 phương pháp xác minh độc lập', () => {
    const p = project({
      location: {
        coordinates: [108.0, 12.7],
        accuracy: 'verified',
        sourceId: 'src-official',
        verificationMethods: ['official-document'],
      },
    });
    expect(rules(dataset([p]))).toContain('location-accuracy-overclaimed');
  });

  it('bắt nguồn có URL không phải https', () => {
    const ds = dataset([project()], {
      sources: [{ ...officialSource, url: 'ftp://x' }, newsSource],
    });
    expect(rules(ds)).toContain('invalid-source-url');
  });

  it('cảnh báo xung đột quan sát chưa được giải quyết', () => {
    const p = project({
      fields: {
        totalInvestment: [
          obs(195, 'src-official', '2026-02-01T00:00:00.000Z', 'official'),
          obs(200, 'src-news', '2026-09-01T00:00:00.000Z', 'derived'),
        ],
      },
    });
    const issue = validateResearchedDataset(dataset([p]), ctx).find(
      (i) => i.rule === 'conflicting-observation',
    );
    expect(issue?.severity).toBe('warning');
  });

  it('cảnh báo quan sát cũ quá 18 tháng', () => {
    const p = project({
      fields: { totalInvestment: [obs(1, 'src-official', '2024-01-01T00:00:00.000Z', 'official')] },
    });
    expect(rules(dataset([p]))).toContain('stale-observation');
  });

  it('dự án "verified" mà thiếu nguồn cho trường chính thì sai', () => {
    expect(rules(dataset([project({ verification: 'verified' })]))).toContain(
      'verified-without-evidence',
    );
  });
});
