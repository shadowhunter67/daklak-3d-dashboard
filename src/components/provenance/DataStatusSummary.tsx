import type { DataStatusCounts } from '../../data-platform/catalog/freshness';

const LABELS: Record<keyof Omit<DataStatusCounts, 'total'>, string> = {
  current: 'Còn mới',
  aging: 'Sắp cũ',
  stale: 'Đã cũ',
  unknown: 'Chưa rõ',
  illustrative: 'Minh họa',
  unavailable: 'Không khả dụng',
};

/**
 * A compact one-line count summary, not a monitoring dashboard (spec §8 explicitly warns against
 * turning this into one) — just enough for someone to notice "2 nguồn đã cũ" at a glance.
 */
export function DataStatusSummary({ counts }: { counts: DataStatusCounts }) {
  return (
    <ul className="data-status-summary" aria-label="Tóm tắt trạng thái dữ liệu">
      {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((key) => (
        <li key={key} data-status={key}>
          <strong>{counts[key]}</strong> {LABELS[key]}
        </li>
      ))}
      <li className="data-status-summary__total">
        Tổng <strong>{counts.total}</strong> nguồn dữ liệu
      </li>
    </ul>
  );
}
