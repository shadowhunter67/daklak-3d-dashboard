import type { DataStatusCounts } from '../../data-platform/catalog/freshness';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';

const LABEL_KEYS: Record<keyof Omit<DataStatusCounts, 'total'>, MessageKey> = {
  current: 'dataStatus.current',
  aging: 'dataStatus.aging',
  stale: 'dataStatus.stale',
  unknown: 'dataStatus.unknown',
  illustrative: 'dataStatus.illustrative',
  unavailable: 'dataStatus.unavailable',
};

/**
 * A compact one-line count summary, not a monitoring dashboard (spec §8 explicitly warns against
 * turning this into one) — just enough for someone to notice "2 nguồn đã cũ" at a glance.
 */
export function DataStatusSummary({ counts }: { counts: DataStatusCounts }) {
  const { t } = useTranslation();
  return (
    <ul className="data-status-summary" aria-label={t('dataStatus.summaryAria')}>
      {(Object.keys(LABEL_KEYS) as Array<keyof typeof LABEL_KEYS>).map((key) => (
        <li key={key} data-status={key}>
          <strong>{counts[key]}</strong> {t(LABEL_KEYS[key])}
        </li>
      ))}
      <li className="data-status-summary__total">
        {t('dataStatus.total', { count: counts.total })}
      </li>
    </ul>
  );
}
