import { PROJECT_STATUS_LABELS } from './model/buildExecutiveOverview';
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
  const entries = (Object.entries(statusDistribution) as [ProjectStatus, number][]).filter(
    ([, count]) => count > 0,
  );
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <section aria-labelledby="status-chart-heading" className="portfolio-status-chart">
      <h3 id="status-chart-heading">Phân bố trạng thái dự án</h3>
      {total === 0 ? (
        <p>Chưa có dự án nào để hiển thị.</p>
      ) : (
        <>
          {/* Biểu đồ trực quan — thuần CSS, không dùng thư viện chart (giữ initial bundle nhẹ). */}
          <div
            className="status-stacked-bar"
            role="img"
            aria-label={`Phân bố trạng thái: ${entries
              .map(([status, count]) => `${PROJECT_STATUS_LABELS[status]} ${count} dự án`)
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
                  {PROJECT_STATUS_LABELS[status]}: {count} dự án (
                  {Math.round((count / total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
