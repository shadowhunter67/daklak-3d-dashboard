import { groupAlerts, severityLabel } from './model/executiveOverviewSelectors';
import type { PortfolioAlert } from './model/executiveOverviewTypes';

function AlertGroup({
  title,
  alerts,
  severity,
}: {
  title: string;
  alerts: PortfolioAlert[];
  severity: 'critical' | 'warning' | 'data-quality';
}) {
  if (alerts.length === 0) return null;
  return (
    <section
      className="alert-group"
      data-severity={severity}
      aria-labelledby={`alert-group-${severity}`}
    >
      <h4 id={`alert-group-${severity}`}>
        {title} <span className="alert-group__count">({alerts.length})</span>
      </h4>
      <ul>
        {alerts.map((alert) => (
          <li key={alert.id} className="alert-item">
            {/* Status is never color-only: a text label always accompanies the visual severity
                marker (spec a11y requirement). */}
            <span className="alert-item__severity">
              {alert.kind === 'data-quality' ? 'Chất lượng dữ liệu' : severityLabel(alert.severity)}
            </span>
            <span className="alert-item__message">{alert.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AlertList({ alerts }: { alerts: readonly PortfolioAlert[] }) {
  const grouped = groupAlerts(alerts);
  const total = alerts.length;

  return (
    <section aria-labelledby="alert-list-heading" className="alert-list">
      <h3 id="alert-list-heading">Danh sách cảnh báo</h3>
      {total === 0 ? (
        <p className="alert-list__empty">Không có cảnh báo nào — danh mục dự án đang ổn định.</p>
      ) : (
        <>
          <AlertGroup title="Nghiêm trọng" alerts={grouped.critical} severity="critical" />
          <AlertGroup title="Cảnh báo" alerts={grouped.warning} severity="warning" />
          <AlertGroup
            title="Chất lượng dữ liệu"
            alerts={grouped.dataQuality}
            severity="data-quality"
          />
        </>
      )}
    </section>
  );
}
