import { useEffect, useMemo, useRef, useState } from 'react';
import { BundledProjectPortfolioSource } from '../../data/projectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import type { ProjectGeometry } from '../../entities/project/types';
import {
  formatAbsoluteDateTime,
  formatKpiValue,
} from '../executive-overview/model/executiveOverviewSelectors';
import { useProjectDetail } from './data/useProjectDetail';
import { ProgressHistorySparkline } from './ProgressHistorySparkline';

const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

const ERROR_KIND_LABEL: Record<string, string> = {
  unauthorized: 'Cần đăng nhập để xem dữ liệu này.',
  forbidden: 'Bạn không có quyền xem dữ liệu này.',
  network: 'Không thể kết nối tới nguồn dữ liệu.',
  timeout: 'Yêu cầu tải dữ liệu đã quá thời gian chờ.',
  'schema-invalid': 'Dữ liệu nhận được không đúng định dạng.',
  'source-unavailable': 'Nguồn dữ liệu hiện không khả dụng.',
  'rate-limited': 'Hệ thống đang quá tải, vui lòng thử lại sau.',
  unknown: 'Đã xảy ra lỗi không xác định.',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

export function ProjectDetailView({
  source,
  projectId,
  onBackToPortfolio,
  onViewOnMap,
}: {
  source?: ProjectPortfolioSource;
  projectId: string;
  onBackToPortfolio: () => void;
  onViewOnMap: (geometry: ProjectGeometry) => void;
}) {
  const [retryToken, setRetryToken] = useState(0);
  const effectiveSource = useMemo(() => source ?? new BundledProjectPortfolioSource(), [source]);
  const state = useProjectDetail(effectiveSource, projectId, retryToken);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [projectId]);

  if (state.status === 'loading') {
    return (
      <section
        id="project-detail"
        className="project-detail"
        aria-live="polite"
        aria-busy="true"
        tabIndex={-1}
      >
        <span className="map-loading__spinner" aria-hidden="true" />
        <p>Đang tải chi tiết dự án…</p>
      </section>
    );
  }

  if (state.status === 'not-found') {
    return (
      <section id="project-detail" className="project-detail" tabIndex={-1}>
        <div className="project-detail__not-found" role="alert">
          <h2 ref={headingRef} tabIndex={-1}>
            Không tìm thấy dự án
          </h2>
          <p>
            Không có dự án nào với mã <code>{projectId}</code> trong danh mục, hoặc dữ liệu dự án
            này không hợp lệ.
          </p>
          <button type="button" onClick={onBackToPortfolio}>
            ← Quay lại Danh mục dự án
          </button>
        </div>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section id="project-detail" className="project-detail" tabIndex={-1}>
        <div className="project-detail__error" role="alert">
          <h2 ref={headingRef} tabIndex={-1}>
            Không thể tải chi tiết dự án
          </h2>
          <p>{ERROR_KIND_LABEL[state.error.kind] ?? ERROR_KIND_LABEL.unknown}</p>
          <p className="project-detail__error-detail">{state.error.message}</p>
          <button type="button" onClick={() => setRetryToken((t) => t + 1)}>
            Thử lại
          </button>
          <button type="button" onClick={onBackToPortfolio}>
            ← Quay lại Danh mục dự án
          </button>
        </div>
      </section>
    );
  }

  const { model } = state;
  const disbursement = formatKpiValue(model.summary.disbursementRate);
  const scheduleVariance = formatKpiValue(model.summary.scheduleVariance);
  const budgetVariance = formatKpiValue(model.summary.budgetVariance);
  const forecastDelay = formatKpiValue(model.summary.forecastDelayInDays);
  const overdueIssues = formatKpiValue(model.issues.overdueIssueCount);

  return (
    <section
      id="project-detail"
      className="project-detail"
      aria-labelledby="project-detail-heading"
      tabIndex={-1}
    >
      <button type="button" className="project-detail__back" onClick={onBackToPortfolio}>
        ← Danh mục dự án
      </button>

      {state.status === 'degraded' && (
        <p role="alert" className="project-detail__degraded-banner">
          Một phần dữ liệu hiện không tải được ({state.sourceIssues.join('; ')}) — nội dung bên dưới
          chỉ tính trên phần dữ liệu đã tải thành công.
        </p>
      )}

      {/* A plain <div>, not <header>: the bare `header { position: absolute; top: 0; ... }`
          selector in global.css is reserved for DashboardHeader's own top bar — an actual
          <header> element here would silently inherit that layout and float on top of the page
          instead of flowing normally inside .project-detail. */}
      <div className="project-detail__header">
        <h2 id="project-detail-heading" ref={headingRef} tabIndex={-1}>
          {model.header.name}
        </h2>
        <p className="project-detail__mock-badge" role="note">
          DỮ LIỆU MINH HỌA — không phải số liệu vận hành chính thức, không dùng cho quyết định quản
          lý thực tế.
        </p>
        <dl className="project-detail__header-grid">
          <div>
            <dt>Mã dự án</dt>
            <dd>{model.header.code}</dd>
          </div>
          <div>
            <dt>Lĩnh vực</dt>
            <dd>{model.header.sectorLabel}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>{model.header.statusLabel}</dd>
          </div>
          <div>
            <dt>Mức ưu tiên</dt>
            <dd>{model.header.priority}</dd>
          </div>
          <div>
            <dt>Dữ liệu cập nhật lúc</dt>
            <dd>{new Date(model.header.dataUpdatedAt).toLocaleString('vi-VN')}</dd>
          </div>
          <div>
            <dt>Độ tin cậy dữ liệu</dt>
            <dd>{model.header.confidenceLabel}</dd>
          </div>
        </dl>
      </div>

      {model.attentionReasons.length > 0 && (
        <section
          aria-labelledby="project-detail-attention-heading"
          className="project-detail__attention"
        >
          <h3 id="project-detail-attention-heading">Vì sao dự án này cần chú ý</h3>
          <ul>
            {model.attentionReasons.map((reason) => (
              <li key={reason.category}>{reason.label}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="project-detail-summary-heading" className="project-detail__summary">
        <h3 id="project-detail-summary-heading">Tóm tắt ngân sách và tiến độ</h3>
        <dl className="project-detail__summary-grid">
          <div>
            <dt>Ngân sách phê duyệt</dt>
            <dd>{vndFormatter.format(model.summary.approvedBudget)} ₫</dd>
          </div>
          <div>
            <dt>Ngân sách điều chỉnh</dt>
            <dd>
              {model.summary.adjustedBudget !== null
                ? `${vndFormatter.format(model.summary.adjustedBudget)} ₫`
                : 'Chưa điều chỉnh'}
            </dd>
          </div>
          <div>
            <dt>Đã giải ngân</dt>
            <dd>{vndFormatter.format(model.summary.disbursedAmount)} ₫</dd>
          </div>
          <div>
            <dt>Tỷ lệ giải ngân</dt>
            <dd>{disbursement.text}</dd>
          </div>
          <div>
            <dt>Tiến độ khối lượng / kế hoạch</dt>
            <dd>
              {model.summary.overallProgress}% / {model.summary.plannedProgress}%
            </dd>
          </div>
          <div>
            <dt>Chênh lệch tiến độ</dt>
            <dd>{scheduleVariance.text}</dd>
          </div>
          <div>
            <dt>Chênh lệch ngân sách</dt>
            <dd>{budgetVariance.text}</dd>
          </div>
          <div>
            <dt>Kế hoạch hoàn thành</dt>
            <dd>
              {model.summary.plannedCompletionDate
                ? new Date(model.summary.plannedCompletionDate).toLocaleDateString('vi-VN')
                : 'Chưa xác định'}
            </dd>
          </div>
          <div>
            <dt>Dự báo hoàn thành</dt>
            <dd>
              {model.summary.forecastCompletionDate
                ? new Date(model.summary.forecastCompletionDate).toLocaleDateString('vi-VN')
                : 'Chưa có dự báo'}
            </dd>
          </div>
          <div>
            <dt>Chậm dự báo so với kế hoạch</dt>
            <dd>{forecastDelay.text}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="project-detail-workpackages-heading"
        className="project-detail__work-packages"
      >
        <h3 id="project-detail-workpackages-heading">Gói thầu ({model.workPackages.length})</h3>
        {model.workPackages.length === 0 ? (
          <p>Chưa có gói thầu nào được ghi nhận.</p>
        ) : (
          <ul className="project-detail__card-list">
            {model.workPackages.map((wp) => (
              <li key={wp.id} className="project-detail__card">
                <p className="project-detail__card-title">
                  {wp.name} <span className="project-portfolio__code">({wp.code})</span>
                </p>
                <p>Trạng thái: {wp.status}</p>
                <p>
                  Tiến độ: {wp.actualProgress}% (kế hoạch {wp.plannedProgress}%)
                </p>
                <p>
                  Kế hoạch: {new Date(wp.plannedStart).toLocaleDateString('vi-VN')} –{' '}
                  {new Date(wp.plannedEnd).toLocaleDateString('vi-VN')}
                </p>
                <p>
                  Ngân sách: {vndFormatter.format(wp.budget)} ₫ — đã thanh toán{' '}
                  {vndFormatter.format(wp.paidAmount)} ₫
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="project-detail-milestones-heading"
        className="project-detail__milestones"
      >
        <h3 id="project-detail-milestones-heading">Mốc tiến độ ({model.milestones.length})</h3>
        {model.milestones.length === 0 ? (
          <p>Chưa có mốc tiến độ nào được ghi nhận.</p>
        ) : (
          <ul className="project-detail__card-list">
            {model.milestones.map((m) => (
              <li key={m.id} className="project-detail__card">
                <p className="project-detail__card-title">
                  {m.name} {m.critical && <span aria-label="Mốc trọng yếu">⚑ Trọng yếu</span>}
                </p>
                <p>Trạng thái: {m.status}</p>
                <p>Kế hoạch: {new Date(m.plannedDate).toLocaleDateString('vi-VN')}</p>
                {m.forecastDate && (
                  <p>Dự báo: {new Date(m.forecastDate).toLocaleDateString('vi-VN')}</p>
                )}
                {m.actualDate && (
                  <p>Thực tế: {new Date(m.actualDate).toLocaleDateString('vi-VN')}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="project-detail-progress-history-heading"
        className="project-detail__progress-history"
      >
        <h3 id="project-detail-progress-history-heading">Lịch sử tiến độ</h3>
        <ProgressHistorySparkline points={model.progressHistory} />
      </section>

      <section aria-labelledby="project-detail-issues-heading" className="project-detail__issues">
        <h3 id="project-detail-issues-heading">
          Vướng mắc ({model.issues.all.length}) — quá hạn: {overdueIssues.text}
        </h3>
        {model.issues.all.length === 0 ? (
          <p>Không có vướng mắc nào được ghi nhận cho dự án này.</p>
        ) : (
          (['critical', 'high', 'medium', 'low'] as const).map((severity) => {
            const issues = model.issues.bySeverity[severity];
            if (issues.length === 0) return null;
            return (
              <div key={severity} className="project-detail__issue-group">
                <h4>
                  {SEVERITY_LABEL[severity]} ({issues.length})
                </h4>
                <ul className="project-detail__card-list">
                  {issues.map((issue) => (
                    <li key={issue.id} className="project-detail__card">
                      <p className="project-detail__card-title">{issue.title}</p>
                      <p>{issue.description}</p>
                      <p>
                        Trạng thái: {issue.status} — Mở lúc{' '}
                        {new Date(issue.openedAt).toLocaleDateString('vi-VN')}
                        {issue.dueAt &&
                          ` — Hạn xử lý ${new Date(issue.dueAt).toLocaleDateString('vi-VN')}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      <section
        aria-labelledby="project-detail-geography-heading"
        className="project-detail__geography"
      >
        <h3 id="project-detail-geography-heading">Vị trí</h3>
        <p>
          Địa bàn hành chính:{' '}
          {model.geography.administrativeAreaCodes.length > 0
            ? model.geography.administrativeAreaCodes.join(', ')
            : 'Chưa gán địa bàn cụ thể'}
        </p>
        {model.geography.hasGeometry && model.geography.geometry ? (
          <button type="button" onClick={() => onViewOnMap(model.geography.geometry!)}>
            Xem trên bản đồ
          </button>
        ) : (
          <p>Chưa có dữ liệu vị trí.</p>
        )}
      </section>

      <section
        aria-labelledby="project-detail-provenance-heading"
        className="project-detail__provenance"
      >
        <h3 id="project-detail-provenance-heading">Nguồn dữ liệu</h3>
        <ul className="project-detail__card-list">
          {model.provenance.map((entry) =>
            entry.dataset ? (
              <li key={entry.sourceDatasetId} className="project-detail__card">
                <p className="project-detail__card-title">{entry.dataset.title}</p>
                <p>{entry.dataset.description}</p>
                <p>
                  Chất lượng: {entry.dataset.quality.status} — Phiên bản {entry.dataset.version}
                </p>
                {entry.dataset.quality.knownLimitations && (
                  <ul>
                    {entry.dataset.quality.knownLimitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <li key={entry.sourceDatasetId} className="project-detail__card">
                <p>
                  Không tìm thấy mô tả nguồn dữ liệu cho <code>{entry.sourceDatasetId}</code>.
                </p>
              </li>
            ),
          )}
        </ul>
        <dl className="project-detail__header-grid">
          <div>
            <dt>Dữ liệu có hiệu lực</dt>
            <dd>{formatAbsoluteDateTime(model.dataTimeline.effectiveAt)}</dd>
          </div>
          <div>
            <dt>Nguồn công bố</dt>
            <dd>{formatAbsoluteDateTime(model.dataTimeline.sourcePublishedAt)}</dd>
          </div>
          <div>
            <dt>Hệ thống thu thập</dt>
            <dd>{formatAbsoluteDateTime(model.dataTimeline.retrievedAt)}</dd>
          </div>
        </dl>
      </section>
    </section>
  );
}
