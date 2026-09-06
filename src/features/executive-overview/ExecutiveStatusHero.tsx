import { useTranslation } from '../../i18n/useTranslation';
import type { ExecutiveOverviewModel, PortfolioStatus } from './model/executiveOverviewTypes';
import { PORTFOLIO_STATUS_MESSAGE_KEY } from './model/executiveOverviewSelectors';
// Trạng thái không bao giờ chỉ dựa vào màu (spec): mỗi mức có một ký hiệu hình dạng riêng
// (✓/!/✕/?), luôn hiển thị cùng với nhãn chữ ngay bên cạnh — người phân biệt màu kém hoặc đọc
// bằng trình đọc màn hình (aria-hidden trên glyph, chữ vẫn đọc được) đều nhận diện được.
const STATUS_GLYPH: Record<PortfolioStatus, string> = {
  healthy: '✓',
  attention: '!',
  critical: '✕',
  degraded: '?',
};

/**
 * "5-second test" (spec §I/§II) — panel to lớn, đứng đầu trang, phải trả lời ngay: tình hình
 * chung tốt/xấu, có bao nhiêu vấn đề, và loại vấn đề chính là gì — không cần đọc KPI grid hay kéo
 * xuống danh sách dự án mới biết. `attentionProjectCount` là tổng THẬT (không bị cắt bởi giới hạn
 * hiển thị top-5 của `priorityProjects`).
 */
export function ExecutiveStatusHero({ model }: { model: ExecutiveOverviewModel }) {
  const { t } = useTranslation();
  const { portfolioStatus, attentionProjectCount, kpis } = model;
  const totalProjects = kpis.totalProjects.value ?? 0;

  const breakdownParts: string[] = [];
  if ((kpis.delayedProjects.value ?? 0) > 0)
    breakdownParts.push(
      t('executiveStatusHero.breakdown.delayed', { count: String(kpis.delayedProjects.value) }),
    );
  if ((kpis.atRiskProjects.value ?? 0) > 0)
    breakdownParts.push(
      t('executiveStatusHero.breakdown.atRisk', { count: String(kpis.atRiskProjects.value) }),
    );
  if ((kpis.overdueIssues.value ?? 0) > 0)
    breakdownParts.push(
      t('executiveStatusHero.breakdown.overdueIssues', {
        count: String(kpis.overdueIssues.value),
      }),
    );

  return (
    <div className="executive-status-hero" data-status={portfolioStatus} role="status">
      <p className="executive-status-hero__eyebrow">{t('executiveStatusHero.eyebrow')}</p>
      <p className="executive-status-hero__status">
        <span className="executive-status-hero__status-badge" aria-hidden="true">
          {STATUS_GLYPH[portfolioStatus]}
        </span>
        {t(PORTFOLIO_STATUS_MESSAGE_KEY[portfolioStatus])}
      </p>
      {attentionProjectCount > 0 ? (
        <>
          <p className="executive-status-hero__summary">
            {t('executiveStatusHero.summary', {
              count: String(attentionProjectCount),
              total: String(totalProjects),
            })}
          </p>
          {breakdownParts.length > 0 && (
            <p className="executive-status-hero__breakdown">{breakdownParts.join(' · ')}</p>
          )}
        </>
      ) : (
        <p className="executive-status-hero__summary">
          {t('executiveStatusHero.summaryClean', { total: String(totalProjects) })}
        </p>
      )}
    </div>
  );
}
