import { parseIsoDate } from './isoDate';
import { resolveField } from './resolveField';
import {
  OFFICIAL_SOURCE_TYPES,
  type FieldObservation,
  type ResearchedDataset,
  type ResearchedProject,
  type ResearchIssue,
  type ResearchValidationContext,
  type SourceRecord,
} from './types';

const DAY_MS = 24 * 3600 * 1000;
const STALE_MS = 18 * 30.44 * 24 * 3600 * 1000;
/** Số trường có bằng chứng chính thống tối thiểu để bản ghi được gọi là "verified". */
const VERIFIED_MIN_OFFICIAL_FIELDS = 3;

/** Chuẩn hoá tên để so trùng: bỏ dấu, hoa thường, gộp khoảng trắng. */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function observationsOf(p: ResearchedProject): FieldObservation<unknown>[] {
  const histories = Object.values(p.fields) as (FieldObservation<unknown>[] | undefined)[];
  return [p.lifecycle, ...histories.flatMap((h) => h ?? [])];
}

export function validateResearchedDataset(
  ds: ResearchedDataset,
  ctx: ResearchValidationContext,
): ResearchIssue[] {
  const issues: ResearchIssue[] = [];
  const add = (
    rule: string,
    severity: ResearchIssue['severity'],
    message: string,
    projectId?: string,
  ) => issues.push({ rule, severity, message, projectId });

  const sources = new Map<string, SourceRecord>();
  for (const s of ds.sources) {
    sources.set(s.id, s);
    if (!/^https:\/\//.test(s.url))
      add('invalid-source-url', 'error', `Nguồn ${s.id}: URL phải là https`);
  }

  const seen = new Set<string>();
  const seenFingerprints = new Map<string, string>();
  const now = Date.parse(ctx.now);

  for (const p of ds.projects) {
    if (seen.has(p.id)) add('duplicate-project-id', 'error', `ID trùng: ${p.id}`, p.id);
    seen.add(p.id);

    // Cùng tên (bỏ dấu/hoa thường) + cùng đơn vị hành chính + cùng vốn → nhiều khả năng là một dự án.
    const capital = p.fields.totalInvestment?.[0]?.value;
    if (p.administrativeAreaCodes.length > 0) {
      const fingerprint = [
        fold(p.name),
        [...p.administrativeAreaCodes].sort().join(','),
        capital ?? '',
      ].join('|');
      const first = seenFingerprints.get(fingerprint);
      if (first) add('possible-duplicate', 'warning', `Có thể trùng với dự án ${first}`, p.id);
      else seenFingerprints.set(fingerprint, p.id);
    }

    for (const code of p.administrativeAreaCodes) {
      if (!ctx.validAdministrativeCodes.has(code))
        add('unknown-admin-code', 'error', `Mã đơn vị lạ: ${code}`, p.id);
    }

    for (const o of observationsOf(p)) {
      const src = sources.get(o.sourceId);
      if (!src) {
        add('unknown-source', 'error', `Nguồn không có trong registry: ${o.sourceId}`, p.id);
        continue;
      }
      if (o.status === 'official' && !OFFICIAL_SOURCE_TYPES.includes(src.sourceType))
        add(
          'official-claim-without-official-source',
          'error',
          `Quan sát "official" nhưng nguồn ${src.id} là ${src.sourceType}`,
          p.id,
        );
      const observed = parseIsoDate(o.observedAt);
      if (observed === undefined)
        add(
          'invalid-observation-date',
          'error',
          `Ngày quan sát không hợp lệ: "${o.observedAt}"`,
          p.id,
        );
      else if (observed > now + DAY_MS)
        add(
          'future-observation',
          'warning',
          `Quan sát có ngày ở tương lai (${o.observedAt})`,
          p.id,
        );
      else if (now - observed > STALE_MS)
        add('stale-observation', 'warning', `Quan sát cũ (${o.observedAt}) từ ${src.id}`, p.id);
    }

    for (const [key, history] of Object.entries(p.fields) as [
      string,
      FieldObservation<unknown>[] | undefined,
    ][]) {
      if (history && resolveField(history).conflicts.length > 0)
        add('conflicting-observation', 'warning', `Trường ${key} có giá trị mâu thuẫn`, p.id);
    }

    const loc = p.location;
    if (loc) {
      const src = sources.get(loc.sourceId);
      if (!src) add('unknown-source', 'error', `Nguồn vị trí không có: ${loc.sourceId}`, p.id);
      const independent = new Set(
        loc.verificationMethods.filter((m) => m !== 'administrative-centroid'),
      );
      const overclaimed =
        (loc.accuracy === 'verified' && independent.size < 2) ||
        (loc.accuracy === 'official-coordinate' &&
          !(src && OFFICIAL_SOURCE_TYPES.includes(src.sourceType)));
      if (overclaimed)
        add(
          'location-accuracy-overclaimed',
          'error',
          `Độ chính xác vị trí "${loc.accuracy}" không đủ bằng chứng`,
          p.id,
        );
    }

    if (p.verification === 'verified') {
      const officialFields = Object.values(p.fields).filter((h) =>
        h?.some((o) => o.status === 'official'),
      ).length;
      if (officialFields < VERIFIED_MIN_OFFICIAL_FIELDS)
        add(
          'verified-without-evidence',
          'error',
          `"verified" cần ≥${VERIFIED_MIN_OFFICIAL_FIELDS} trường có nguồn chính thống`,
          p.id,
        );
    }
  }
  return issues;
}
