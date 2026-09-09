import type { MessageKey } from '../../../i18n/messages';
import type { ProjectPortfolioRow } from './projectPortfolioTypes';

/**
 * CSV export for the Project Portfolio table — always exports the rows CURRENTLY VISIBLE to the
 * caller (i.e. after filter/sort are applied by `ProjectPortfolioView`), not the full unfiltered
 * dataset, matching "you get what you see" convention for any list export. Pure function, no DOM
 * access — `ProjectPortfolioView.tsx` turns the string into a Blob/download link, this module only
 * builds the text so it stays unit-testable without jsdom Blob/URL plumbing.
 *
 * Column headers and enum values (sector/status/reasonCategory) are resolved through the SAME
 * `t()` translator the table itself uses (never a hardcoded Vietnamese string) — see
 * docs/adr/0003-internationalization.md. `KpiResult` columns (`disbursementRate`,
 * `dataFreshnessDays`) export the raw numeric `value` (or empty string when `status !==
 * 'available'`), not the localized "—" placeholder text the UI shows — a spreadsheet column mixing
 * numbers and dashes doesn't sort/filter usefully in Excel/Sheets.
 */

export type Translator = (key: MessageKey, params?: Record<string, string | number>) => string;

const COLUMN_KEYS = [
  'code',
  'name',
  'sector',
  'status',
  'plannedProgress',
  'overallProgress',
  'disbursementRate',
  'plannedCompletionDate',
  'dataFreshnessDays',
  'reasonCategory',
  'administrativeAreaCodes',
] as const;

/** RFC 4180 field escaping: wrap in quotes (and double any embedded quote) whenever the field
 * contains a comma, quote, or line break — CSV consumers ignore quoting for the "safe" fields
 * (numbers, codes) but Excel/Sheets both require it for text carrying any of those three. */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

/** Builds the full CSV text (header row + one row per project), UTF-8 with a BOM prefix — Excel on
 * Windows (the realistic viewer for a Vietnamese-diacritics CSV) otherwise guesses the wrong
 * codepage and renders "Xây dá»±ng" instead of "Xây dựng" without it. `\r\n` line endings for the
 * same Excel-compatibility reason (bare `\n` is read fine by most tools but is the one that isn't
 * universally safe). */
export function buildProjectPortfolioCsv(rows: ProjectPortfolioRow[], t: Translator): string {
  const header = csvRow(COLUMN_KEYS.map((key) => t(`portfolio.export.col.${key}` as MessageKey)));
  const body = rows.map((row) =>
    csvRow([
      row.code,
      row.name,
      t(`sector.${row.sector}` as MessageKey),
      t(`status.${row.status}` as MessageKey),
      String(row.plannedProgress),
      String(row.overallProgress),
      row.disbursementRate.status === 'ok' && row.disbursementRate.value !== null
        ? String(row.disbursementRate.value)
        : '',
      row.plannedCompletionDate ?? '',
      row.dataFreshnessDays.status === 'ok' && row.dataFreshnessDays.value !== null
        ? String(row.dataFreshnessDays.value)
        : '',
      row.reasonCategory ? t(`reason.${row.reasonCategory}` as MessageKey) : '',
      row.administrativeAreaCodes.join('; '),
    ]),
  );
  const BOM = '﻿';
  return [BOM + header, ...body].join('\r\n');
}
