import { describe, expect, it } from 'vitest';
import labels from '#province-assets/daklak-labels.json';
import {
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from '../../../entities/project/illustrativeProjectPortfolio';
import { vi as viMessages } from '../../../i18n/messages/vi';
import type { MessageKey } from '../../../i18n/messages';
import { buildProjectPortfolioViewModel } from './buildProjectPortfolioViewModel';
import { buildProjectPortfolioCsv } from './exportProjectPortfolioCsv';

/** Minimal stand-in for the real `t()` — this module's own tests only need the Vietnamese
 * dictionary (parity with en.ts is already covered by `dictionaryParity.test.ts`), so pulling in
 * the full `I18nProvider`/React tree here would test nothing this doesn't. */
const t = (key: MessageKey): string => viMessages[key];

const validAdministrativeCodes = new Set(Object.keys(labels));
const asOf = new Date(MOCK_REFERENCE_DATE);
const model = buildProjectPortfolioViewModel({
  bundles: MOCK_PROJECT_BUNDLES,
  context: { validAdministrativeCodes, asOf },
});

describe('buildProjectPortfolioCsv', () => {
  it('starts with a UTF-8 BOM followed by the translated header row', () => {
    const csv = buildProjectPortfolioCsv([], t);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const header = csv.slice(1).split('\r\n')[0];
    expect(header).toBe(
      [
        'Mã dự án',
        'Tên dự án',
        'Lĩnh vực',
        'Trạng thái',
        'Tiến độ kế hoạch (%)',
        'Tiến độ thực tế (%)',
        'Tỷ lệ giải ngân (%)',
        'Kế hoạch hoàn thành',
        'Độ mới dữ liệu (ngày)',
        'Lý do cần chú ý',
        'Mã xã/phường liên quan',
      ].join(','),
    );
  });

  it('emits exactly one data row per project, in the given order', () => {
    const rows = model.rows.slice(0, 3);
    const csv = buildProjectPortfolioCsv(rows, t);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(1 + rows.length);
    expect(lines[1]).toContain(rows[0].code);
    expect(lines[2]).toContain(rows[1].code);
    expect(lines[3]).toContain(rows[2].code);
  });

  it('quotes fields containing a comma (project names commonly have one)', () => {
    const withComma = { ...model.rows[0], name: 'Đường A, đoạn B' };
    const csv = buildProjectPortfolioCsv([withComma], t);
    expect(csv).toContain('"Đường A, đoạn B"');
  });

  it('escapes an embedded double-quote by doubling it, per RFC 4180', () => {
    const withQuote = { ...model.rows[0], name: 'Cầu "Sông Hồng"' };
    const csv = buildProjectPortfolioCsv([withQuote], t);
    expect(csv).toContain('"Cầu ""Sông Hồng"""');
  });

  it('exports the raw numeric KPI value, not a localized dash placeholder', () => {
    const withKpi = {
      ...model.rows[0],
      disbursementRate: {
        value: 42,
        unit: '%',
        status: 'ok' as const,
        calculatedAt: asOf.toISOString(),
        sourceDatasetIds: [],
        missingInputs: [],
        explanation: 'test',
      },
    };
    const csv = buildProjectPortfolioCsv([withKpi], t);
    const dataLine = csv.split('\r\n')[1];
    expect(dataLine.split(',')).toContain('42');
  });

  it('leaves the KPI column empty (not "0" or a dash) when the KPI is unavailable', () => {
    const withoutKpi = {
      ...model.rows[0],
      disbursementRate: {
        value: null,
        unit: '%',
        status: 'unavailable' as const,
        calculatedAt: asOf.toISOString(),
        sourceDatasetIds: [],
        missingInputs: ['x'],
        explanation: 'test',
      },
    };
    const csv = buildProjectPortfolioCsv([withoutKpi], t);
    const dataLine = csv.split('\r\n')[1];
    const fields = dataLine.split(',');
    // disbursementRate is the 7th column (index 6) — code,name,sector,status,plannedProgress,
    // overallProgress,disbursementRate,...
    expect(fields[6]).toBe('');
  });

  it('joins multiple administrative area codes with "; "', () => {
    const multiArea = { ...model.rows[0], administrativeAreaCodes: ['AAA', 'BBB'] };
    const csv = buildProjectPortfolioCsv([multiArea], t);
    expect(csv).toContain('AAA; BBB');
  });

  it('returns just the header row for an empty project list', () => {
    const csv = buildProjectPortfolioCsv([], t);
    expect(csv.split('\r\n')).toHaveLength(1);
  });
});
