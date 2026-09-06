import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import type { ProjectStatus } from '../../entities/project/types';

/** Mỗi trạng thái có một màu riêng — trước đây 4 trạng thái tiền thi công (proposed/preparing/
 * approved/procurement) đều rơi vào cùng `DEFAULT_COLOR`, và `suspended` dùng một xám-xanh gần như
 * không phân biệt được với màu mặc định đó nữa — 5/10 đoạn trên biểu đồ nhìn giống hệt nhau
 * (phản hồi thực tế: "màu gì nhìn vào ko phân biệt được luôn"). Legend luôn có tên + số + % đi kèm
 * nên màu không phải là kênh thông tin duy nhất, nhưng vẫn phải đủ khác nhau để nhóm mắt nhanh qua
 * thanh stacked bar mà không cần dò legend cho từng đoạn nhỏ. */
const STATUS_COLOR: Partial<Record<ProjectStatus, string>> = {
  proposed: '#b48ee0',
  preparing: '#8f7fd9',
  approved: '#6f9ad9',
  procurement: '#d98ecb',
  active: '#3fae7d',
  'at-risk': '#e0b34c',
  delayed: '#d97757',
  suspended: '#c1554f',
  completed: '#4fc9c2',
  cancelled: '#8a8fa0',
};
const DEFAULT_COLOR = '#5b5f6e';

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
