import type { KpiResult } from '../../entities/project/kpi/types';
import { formatKpiValue } from './model/executiveOverviewSelectors';
import type { ExecutiveOverviewKpis } from './model/executiveOverviewTypes';

const KPI_CARD_DEFS: Array<{ key: keyof ExecutiveOverviewKpis; label: string }> = [
  { key: 'totalProjects', label: 'Tổng số dự án' },
  { key: 'totalApprovedBudget', label: 'Tổng vốn đầu tư' },
  { key: 'disbursementRate', label: 'Tỷ lệ giải ngân' },
  { key: 'onTrackProjects', label: 'Đúng tiến độ' },
  { key: 'atRiskProjects', label: 'Có nguy cơ' },
  { key: 'delayedProjects', label: 'Chậm tiến độ' },
  { key: 'overdueIssues', label: 'Vướng mắc quá hạn' },
];

function KpiCard({ label, kpi }: { label: string; kpi: KpiResult }) {
  const { text, isUnavailable } = formatKpiValue(kpi);
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
          {kpi.explanation || 'Thiếu dữ liệu đầu vào cần thiết.'}
        </p>
      ) : (
        <p className="visually-hidden">{kpi.explanation}</p>
      )}
    </li>
  );
}

export function KpiCardGrid({ kpis }: { kpis: ExecutiveOverviewKpis }) {
  return (
    <section aria-labelledby="kpi-grid-heading">
      <h3 id="kpi-grid-heading">Chỉ số tổng quan</h3>
      <ul className="kpi-card-grid">
        {KPI_CARD_DEFS.map(({ key, label }) => (
          <KpiCard key={key} label={label} kpi={kpis[key]} />
        ))}
      </ul>
    </section>
  );
}
