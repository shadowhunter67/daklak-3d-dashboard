import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import type { ProjectStatus } from '../../entities/project/types';

/** Chỉ những status thường gặp trong một danh mục đang vận hành mới có màu riêng trong biểu đồ —
 * trạng thái hiếm hoặc chỉ mang tính thủ tục dùng chung một màu trung tính để bảng màu không vượt
 * quá khả năng phân biệt bằng mắt. */
const STATUS_COLOR: Partial<Record<ProjectStatus, string>> = {
  active: '#3fae7d',
  'at-risk': '#e0b34c',
  delayed: '#d97757',
  suspended: '#8b8fa3',
  completed: '#4c8fd9',
  cancelled: '#5b5f6e',
};
const DEFAULT_COLOR = '#6b8f84';

export function PortfolioStatusChart({
  statusDistribution,
}: {
  statusDistribution: Record<ProjectStatus, number>;
}) {
  const { t } = useTranslation();
  const entries = (Object.entries(statusDistribution) as [ProjectStatus, number][]).filter(
    ([, count]) => count > 0,
  );
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const statusLabel = (status: ProjectStatus) => t(`status.${status}` as MessageKey);

  return (
    <section aria-labelledby="status-chart-heading" className="portfolio-status-chart">
      <h3 id="status-chart-heading">{t('statusChart.heading')}</h3>
      {total === 0 ? (
        <p>{t('statusChart.empty')}</p>
      ) : (
        <>
          {/* Biểu đồ trực quan — thuần CSS, không dùng thư viện chart (giữ initial bundle nhẹ). */}
          <div
            className="status-stacked-bar"
            role="img"
            aria-label={`${t('statusChart.ariaLabelPrefix')} ${entries
              .map(([status, count]) =>
                t('statusChart.segment', { label: statusLabel(status), count }),
              )
              .join(', ')}.`}
          >
            {entries.map(([status, count]) => (
              <span
                key={status}
                className="status-stacked-bar__segment"
                style={{
                  width: `${(count / total) * 100}%`,
                  background: STATUS_COLOR[status] ?? DEFAULT_COLOR,
                }}
              />
            ))}
          </div>
          {/* Tương đương văn bản đầy đủ cho trình đọc màn hình và cho người dùng không phân biệt
              màu — trạng thái không bao giờ chỉ truyền đạt bằng màu sắc. */}
          <ul className="status-legend">
            {entries.map(([status, count]) => (
              <li key={status}>
                <span
                  className="status-legend__swatch"
                  style={{ background: STATUS_COLOR[status] ?? DEFAULT_COLOR }}
                  aria-hidden="true"
                />
                <span>
                  {t('statusChart.legendItem', {
                    label: statusLabel(status),
                    count,
                    percent: Math.round((count / total) * 100),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
