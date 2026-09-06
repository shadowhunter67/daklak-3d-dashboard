import type { KpiResult } from '../../entities/project/kpi/types';
import type { PortfolioTrendResult } from '../../entities/project/kpi/portfolioTrend';
import { formatKpiValueLocalized } from './model/executiveOverviewSelectors';
import { formatPercentagePointsDelta } from '../../i18n/formatters';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import type { ExecutiveOverviewKpis } from './model/executiveOverviewTypes';

/** Nhóm ngữ nghĩa cho mỗi KPI — chỉ dùng để tô màu vòng tròn trang trí (`kpi-card__icon`), không
 * mang thông tin riêng (trạng thái vẫn luôn có nhãn chữ đi kèm, không bao giờ chỉ dựa vào màu). */
type KpiGroup = 'count' | 'money' | 'rate' | 'warning';

const KPI_CARD_DEFS: Array<{
  key: keyof ExecutiveOverviewKpis;
  labelKey: MessageKey;
  group: KpiGroup;
}> = [
  { key: 'totalProjects', labelKey: 'kpi.totalProjects', group: 'count' },
  { key: 'totalApprovedBudget', labelKey: 'kpi.totalApprovedBudget', group: 'money' },
  { key: 'disbursementRate', labelKey: 'kpi.disbursementRate', group: 'rate' },
  { key: 'onTrackProjects', labelKey: 'kpi.onTrackProjects', group: 'count' },
  { key: 'atRiskProjects', labelKey: 'kpi.atRiskProjects', group: 'warning' },
  { key: 'delayedProjects', labelKey: 'kpi.delayedProjects', group: 'warning' },
  { key: 'overdueIssues', labelKey: 'kpi.overdueIssues', group: 'warning' },
];

function KpiTrendIndicator({ trend }: { trend: PortfolioTrendResult }) {
  const { t, locale } = useTranslation();
  if (trend.status !== 'ok' || trend.deltaPercentagePoints === null) return null;
  const delta = trend.deltaPercentagePoints;
  const direction = delta > 0.05 ? 'increase' : delta < -0.05 ? 'decrease' : 'flat';
  // Mũi tên là trang trí — hướng thật của xu hướng luôn được nói bằng chữ ("Tăng"/"Giảm"/"Không
  // đổi") qua `kpi.trend.*`, không chỉ dựa vào hình mũi tên hay màu sắc.
  const arrow = direction === 'increase' ? '▲' : direction === 'decrease' ? '▼' : '—';
  const label = t(`kpi.trend.${direction}`, {
    value: formatPercentagePointsDelta(delta, locale),
  });
  return (
    <p
      className="kpi-card__trend"
      data-direction={direction}
      title={t('kpi.trend.tooltip', {
        comparable: String(trend.comparableProjectCount),
        total: String(trend.totalProjectCount),
      })}
    >
      <span aria-hidden="true">{arrow}</span> {label}
    </p>
  );
}

function KpiCard({
  label,
  kpi,
  group,
  trend,
}: {
  label: string;
  kpi: KpiResult;
  group: KpiGroup;
  trend?: PortfolioTrendResult;
}) {
  const { t, locale } = useTranslation();
  const { text, isUnavailable, fullText } = formatKpiValueLocalized(kpi, locale, t);
  return (
    <li className="kpi-card" data-unavailable={isUnavailable || undefined} data-kpi-group={group}>
      <span className="kpi-card__icon" aria-hidden="true" />
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
      {trend && <KpiTrendIndicator trend={trend} />}
    </li>
  );
}

export function KpiCardGrid({
  kpis,
  disbursementRateTrend,
}: {
  kpis: ExecutiveOverviewKpis;
  disbursementRateTrend?: PortfolioTrendResult;
}) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="kpi-grid-heading">
      <h3 id="kpi-grid-heading">{t('kpi.heading')}</h3>
      <ul className="kpi-card-grid">
        {KPI_CARD_DEFS.map(({ key, labelKey, group }) => (
          <KpiCard
            key={key}
            label={t(labelKey)}
            kpi={kpis[key]}
            group={group}
            trend={key === 'disbursementRate' ? disbursementRateTrend : undefined}
          />
        ))}
      </ul>
    </section>
  );
}
