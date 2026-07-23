import { useMemo, useState } from 'react';
import { BundledProjectPortfolioSource } from '../../data/projectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import type { PortfolioStatus } from './model/executiveOverviewTypes';
import { AlertList } from './AlertList';
import { DataHealthPanel } from './DataHealthPanel';
import { KpiCardGrid } from './KpiCardGrid';
import { PortfolioStatusChart } from './PortfolioStatusChart';
import { PriorityProjectList } from './PriorityProjectList';
import { useExecutiveOverview } from './data/useExecutiveOverview';

const PORTFOLIO_STATUS_LABEL: Record<PortfolioStatus, string> = {
  healthy: 'Ổn định',
  attention: 'Cần chú ý',
  critical: 'Nghiêm trọng',
  degraded: 'Dữ liệu chưa đầy đủ',
};

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

/**
 * Executive Overview — landing mặc định mới (Phase 2A). Component chỉ render `ExecutiveOverviewModel`
 * (từ `buildExecutiveOverview` qua `useExecutiveOverview`), không tự tính KPI. `source` cho phép
 * test/story tiêm `FakeProjectPortfolioSource` để mô phỏng loading/degraded/error mà
 * `BundledProjectPortfolioSource` (luôn ok) không tự tạo ra được.
 */
export function ExecutiveOverview({ source }: { source?: ProjectPortfolioSource }) {
  const [retryToken, setRetryToken] = useState(0);
  const effectiveSource = useMemo(() => source ?? new BundledProjectPortfolioSource(), [source]);
  const state = useExecutiveOverview(effectiveSource, retryToken);

  if (state.status === 'loading') {
    return (
      <section
        id="executive-overview"
        className="executive-overview"
        aria-live="polite"
        aria-busy="true"
        tabIndex={-1}
      >
        <span className="map-loading__spinner" aria-hidden="true" />
        <p>Đang tải tổng quan danh mục dự án…</p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section id="executive-overview" className="executive-overview" tabIndex={-1}>
        <div className="executive-overview__error" role="alert">
          <h2>Không thể tải dữ liệu dự án</h2>
          <p>{ERROR_KIND_LABEL[state.error.kind] ?? ERROR_KIND_LABEL.unknown}</p>
          <p className="executive-overview__error-detail">{state.error.message}</p>
          {state.error.requestId && <p>Mã yêu cầu: {state.error.requestId}</p>}
          <button type="button" onClick={() => setRetryToken((token) => token + 1)}>
            Thử lại
          </button>
        </div>
      </section>
    );
  }

  const { model } = state;
  const asOf = new Date(model.generatedAt);
  const isEmpty = model.kpis.totalProjects.value === 0;

  return (
    <section
      id="executive-overview"
      className="executive-overview"
      aria-labelledby="executive-overview-heading"
      tabIndex={-1}
    >
      <h2 id="executive-overview-heading">Tổng quan điều hành dự án trọng điểm</h2>
      <p className="executive-overview__mock-badge" role="note">
        DỮ LIỆU MINH HỌA — không phải số liệu vận hành chính thức, không dùng cho quyết định quản lý
        thực tế.
      </p>
      <p className="executive-overview__status" data-status={model.portfolioStatus}>
        Trạng thái danh mục: <strong>{PORTFOLIO_STATUS_LABEL[model.portfolioStatus]}</strong>
        <span aria-hidden="true"> · </span>
        Dữ liệu cập nhật lúc {asOf.toLocaleString('vi-VN')}
      </p>
      {state.status === 'degraded' && (
        <p role="alert" className="executive-overview__degraded-banner">
          Một phần dữ liệu hiện không tải được ({state.sourceIssues.join('; ')}) — các số liệu bên
          dưới chỉ tính trên phần dữ liệu đã tải thành công.
        </p>
      )}
      {isEmpty ? (
        <p className="executive-overview__empty">
          Chưa có dự án nào trong danh mục. Khi có dữ liệu, tổng quan sẽ hiển thị tại đây.
        </p>
      ) : (
        <>
          <KpiCardGrid kpis={model.kpis} />
          <div className="executive-overview__columns">
            <PriorityProjectList items={model.priorityProjects} asOf={asOf} />
            <div className="executive-overview__side-column">
              <AlertList alerts={model.alerts} />
              <PortfolioStatusChart statusDistribution={model.statusDistribution} />
              <DataHealthPanel dataHealth={model.dataHealth} asOf={asOf} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
