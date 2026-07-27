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
  const { text, isUnavailable } = formatKpiValueLocalized(kpi, locale, t);
  return (
    <li className="kpi-card" data-unavailable={isUnavailable || undefined}>
      <p className="kpi-card__label" id={`kpi-label-${label}`}>
        {label}
      </p>
      <p className="kpi-card__value" aria-describedby={`kpi-label-${label}`}>
        {text}
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
