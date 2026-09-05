import type { KpiResult } from '../../entities/project/kpi/types';
import { formatKpiValueLocalized } from './model/executiveOverviewSelectors';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import type { ExecutiveOverviewKpis } from './model/executiveOverviewTypes';

const KPI_CARD_DEFS: Array<{ key: keyof ExecutiveOverviewKpis; labelKey: MessageKey }> = [
  { key: 'totalProjects', labelKey: 'kpi.totalProjects' },
  { key: 'totalApprovedBudget', labelKey: 'kpi.totalApprovedBudget' },
  { key: 'disbursementRate', labelKey: 'kpi.disbursementRate' },
  { key: 'onTrackProjects', labelKey: 'kpi.onTrackProjects' },
  { key: 'atRiskProjects', labelKey: 'kpi.atRiskProjects' },
  { key: 'delayedProjects', labelKey: 'kpi.delayedProjects' },
  { key: 'overdueIssues', labelKey: 'kpi.overdueIssues' },
];

function KpiCard({ label, kpi }: { label: string; kpi: KpiResult }) {
  const { t, locale } = useTranslation();
  const { text, isUnavailable, fullText } = formatKpiValueLocalized(kpi, locale, t);
  return (
    <li className="kpi-card" data-unavailable={isUnavailable || undefined}>
      <p className="kpi-card__label" id={`kpi-label-${label}`}>
        {label}
      </p>
      <p className="kpi-card__value" aria-describedby={`kpi-label-${label}`} title={fullText}>
        {text}
        {/* A compact number ("2,5 nghìn tỷ ₫") loses precision for a screen-reader user who can't
            see the `title` tooltip — spell out the exact figure too (spec §M: never hide the full
            value, only avoid rendering it as the primary, wrap-prone text). */}
        {fullText && <span className="visually-hidden"> ({fullText})</span>}
      </p>
      {isUnavailable ? (
        <p className="kpi-card__explanation">
          {kpi.explanation || t('kpi.unavailableExplanation')}
        </p>
      ) : (
        <p className="visually-hidden">{kpi.explanation}</p>
      )}
    </li>
  );
}

export function KpiCardGrid({ kpis }: { kpis: ExecutiveOverviewKpis }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="kpi-grid-heading">
      <h3 id="kpi-grid-heading">{t('kpi.heading')}</h3>
      <ul className="kpi-card-grid">
        {KPI_CARD_DEFS.map(({ key, labelKey }) => (
          <KpiCard key={key} label={t(labelKey)} kpi={kpis[key]} />
        ))}
      </ul>
    </section>
  );
}
