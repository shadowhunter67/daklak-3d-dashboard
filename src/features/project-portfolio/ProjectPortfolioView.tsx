import { useEffect, useMemo, useRef, useState } from 'react';
import { BundledProjectPortfolioSource } from '../../data/projectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import { formatKpiValue } from '../executive-overview/model/executiveOverviewSelectors';
import { useProjectPortfolio } from './data/useProjectPortfolio';
import {
  filterProjectPortfolioRows,
  sortProjectPortfolioRows,
} from './model/filterSortProjectPortfolio';
import type { ProjectPortfolioRow } from './model/projectPortfolioTypes';
import type { PortfolioFilters, PortfolioSortKey } from '../../routing/hashRoute';
import { serializePortfolioHash } from '../../routing/hashRoute';

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

const SORT_LABEL: Record<PortfolioSortKey, string> = {
  'attention-first': 'Cần chú ý trước',
  'name-asc': 'Tên A → Z',
  'disbursement-desc': 'Giải ngân cao → thấp',
  'progress-asc': 'Tiến độ thấp → cao',
  'freshness-desc': 'Dữ liệu cũ nhất trước',
};

function ProjectRow({ row, onOpen }: { row: ProjectPortfolioRow; onOpen: () => void }) {
  const disbursement = formatKpiValue(row.disbursementRate);
  const freshness = formatKpiValue(row.dataFreshnessDays);
  return (
    <>
      <td>
        <button type="button" className="project-portfolio__row-link" onClick={onOpen}>
          {row.name} <span className="project-portfolio__code">({row.code})</span>
        </button>
      </td>
      <td>{row.sectorLabel}</td>
      <td>{row.statusLabel}</td>
      <td>
        {row.overallProgress}% <span aria-hidden="true">/</span> kế hoạch {row.plannedProgress}%
      </td>
      <td>{disbursement.text}</td>
      <td>
        {row.plannedCompletionDate
          ? new Date(row.plannedCompletionDate).toLocaleDateString('vi-VN')
          : 'Chưa xác định'}
      </td>
      <td>{freshness.text}</td>
      <td>{row.primaryReason ?? 'Không có'}</td>
    </>
  );
}

function ProjectCard({ row, onOpen }: { row: ProjectPortfolioRow; onOpen: () => void }) {
  const disbursement = formatKpiValue(row.disbursementRate);
  const freshness = formatKpiValue(row.dataFreshnessDays);
  return (
    <li className="project-portfolio-card">
      <button type="button" className="project-portfolio-card__title" onClick={onOpen}>
        {row.name} <span className="project-portfolio__code">({row.code})</span>
      </button>
      <dl className="project-portfolio-card__grid">
        <div>
          <dt>Lĩnh vực</dt>
          <dd>{row.sectorLabel}</dd>
        </div>
        <div>
          <dt>Trạng thái</dt>
          <dd>{row.statusLabel}</dd>
        </div>
        <div>
          <dt>Tiến độ</dt>
          <dd>
            {row.overallProgress}% (kế hoạch {row.plannedProgress}%)
          </dd>
        </div>
        <div>
          <dt>Giải ngân</dt>
          <dd>{disbursement.text}</dd>
        </div>
        <div>
          <dt>Kế hoạch hoàn thành</dt>
          <dd>
            {row.plannedCompletionDate
              ? new Date(row.plannedCompletionDate).toLocaleDateString('vi-VN')
              : 'Chưa xác định'}
          </dd>
        </div>
        <div>
          <dt>Độ mới dữ liệu</dt>
          <dd>{freshness.text}</dd>
        </div>
        <div>
          <dt>Lý do cần chú ý</dt>
          <dd>{row.primaryReason ?? 'Không có'}</dd>
        </div>
      </dl>
    </li>
  );
}

export function ProjectPortfolioView({
  source,
  filters,
  onFiltersChange,
  onOpenProject,
  onBackToOverview,
}: {
  source?: ProjectPortfolioSource;
  filters: PortfolioFilters;
  onFiltersChange: (filters: PortfolioFilters, opts?: { replace?: boolean }) => void;
  onOpenProject: (projectId: string) => void;
  onBackToOverview: () => void;
}) {
  const [retryToken, setRetryToken] = useState(0);
  const effectiveSource = useMemo(() => source ?? new BundledProjectPortfolioSource(), [source]);
  const state = useProjectPortfolio(effectiveSource, retryToken);

  // Search box keeps its own instant local value; `filters.query` (and therefore `sorted.length`
  // below, and the live region that announces it) only settles after the user pauses typing —
  // this is what keeps the live region from announcing on every keystroke (spec D7), without a
  // second, redundant debounce layer just for the announcement itself.
  const [searchInput, setSearchInput] = useState(filters.query ?? '');
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    // Keeps the search box in sync with external URL changes (Back/Forward, a shared link with
    // `q=` already set) — deliberate, same pattern as `useExecutiveOverview`'s loading reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(filters.query ?? '');
  }, [filters.query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((filters.query ?? '') === searchInput.trim()) return;
      onFiltersChange({ ...filters, query: searchInput.trim() || undefined }, { replace: true });
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const sorted = useMemo(() => {
    if (state.status !== 'ok' && state.status !== 'degraded') return [];
    const filtered = filterProjectPortfolioRows(state.model.rows, filters);
    return sortProjectPortfolioRows(filtered, filters.sort ?? 'attention-first');
  }, [state, filters]);

  if (state.status === 'loading') {
    return (
      <section
        id="project-portfolio"
        className="project-portfolio"
        aria-live="polite"
        aria-busy="true"
        tabIndex={-1}
      >
        <span className="map-loading__spinner" aria-hidden="true" />
        <p>Đang tải danh mục dự án…</p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section id="project-portfolio" className="project-portfolio" tabIndex={-1}>
        <div className="project-portfolio__error" role="alert">
          <h2>Không thể tải danh mục dự án</h2>
          <p>{ERROR_KIND_LABEL[state.error.kind] ?? ERROR_KIND_LABEL.unknown}</p>
          <p className="project-portfolio__error-detail">{state.error.message}</p>
          <button type="button" onClick={() => setRetryToken((t) => t + 1)}>
            Thử lại
          </button>
          <button type="button" onClick={onBackToOverview}>
            Quay lại Tổng quan điều hành
          </button>
        </div>
      </section>
    );
  }

  const { model } = state;
  const hasActiveFilters = Boolean(
    filters.status || filters.sector || filters.area || filters.query,
  );

  return (
    <section
      id="project-portfolio"
      className="project-portfolio"
      aria-labelledby="project-portfolio-heading"
      tabIndex={-1}
    >
      <button type="button" className="project-portfolio__back" onClick={onBackToOverview}>
        ← Tổng quan điều hành
      </button>
      <h2 id="project-portfolio-heading" ref={headingRef} tabIndex={-1}>
        Danh mục dự án trọng điểm
      </h2>
      <p className="project-portfolio__mock-badge" role="note">
        DỮ LIỆU MINH HỌA — không phải số liệu vận hành chính thức, không dùng cho quyết định quản lý
        thực tế.
      </p>
      <p className="project-portfolio__description">
        Tìm kiếm, lọc và sắp xếp toàn bộ dự án trọng điểm trong danh mục minh hoạ.
      </p>
      {state.status === 'degraded' && (
        <p role="alert" className="project-portfolio__degraded-banner">
          Một phần dữ liệu hiện không tải được ({state.sourceIssues.join('; ')}) — danh sách bên
          dưới chỉ tính trên phần dữ liệu đã tải thành công.
        </p>
      )}

      <form
        className="project-portfolio__filters"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-search">Tìm theo tên hoặc mã dự án</label>
          <input
            id="project-portfolio-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Ví dụ: cao tốc, PRJ-001…"
          />
        </div>
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-status">Trạng thái</label>
          <select
            id="project-portfolio-status"
            value={filters.status ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
          >
            <option value="">Tất cả trạng thái</option>
            {model.filterOptions.status.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-sector">Lĩnh vực</label>
          <select
            id="project-portfolio-sector"
            value={filters.sector ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, sector: e.target.value || undefined })}
          >
            <option value="">Tất cả lĩnh vực</option>
            {model.filterOptions.sector.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-area">Địa bàn</label>
          <select
            id="project-portfolio-area"
            value={filters.area ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, area: e.target.value || undefined })}
          >
            <option value="">Tất cả địa bàn</option>
            {model.filterOptions.area.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-sort">Sắp xếp</label>
          <select
            id="project-portfolio-sort"
            value={filters.sort ?? 'attention-first'}
            onChange={(e) =>
              onFiltersChange({ ...filters, sort: e.target.value as PortfolioSortKey })
            }
          >
            {Object.entries(SORT_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="project-portfolio__clear-filters"
          disabled={!hasActiveFilters}
          onClick={() => {
            setSearchInput('');
            onFiltersChange({});
          }}
        >
          Xoá bộ lọc
        </button>
      </form>

      <p aria-live="polite" aria-atomic="true" className="project-portfolio__result-count">
        {sorted.length} / {model.totalCount} dự án
      </p>

      {sorted.length === 0 ? (
        <p className="project-portfolio__empty">
          Không có dự án nào khớp với bộ lọc hiện tại.{' '}
          {hasActiveFilters && (
            <button
              type="button"
              className="project-portfolio__clear-filters-inline"
              onClick={() => {
                setSearchInput('');
                onFiltersChange({});
              }}
            >
              Xoá bộ lọc
            </button>
          )}
        </p>
      ) : (
        <>
          <div
            className="project-portfolio-table-wrap"
            role="region"
            aria-label="Bảng danh mục dự án"
          >
            <table className="project-portfolio-table">
              <caption className="visually-hidden">Danh mục dự án trọng điểm</caption>
              <thead>
                <tr>
                  <th scope="col">Dự án</th>
                  <th scope="col">Lĩnh vực</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Tiến độ</th>
                  <th scope="col">Giải ngân</th>
                  <th scope="col">Kế hoạch hoàn thành</th>
                  <th scope="col">Độ mới dữ liệu</th>
                  <th scope="col">Lý do cần chú ý</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.projectId}>
                    <ProjectRow row={row} onOpen={() => onOpenProject(row.projectId)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="project-portfolio-cards">
            {sorted.map((row) => (
              <ProjectCard
                key={row.projectId}
                row={row}
                onOpen={() => onOpenProject(row.projectId)}
              />
            ))}
          </ul>
        </>
      )}
      <p className="project-portfolio__hash-hint">
        Liên kết hiện tại: <code>{serializePortfolioHash(filters)}</code>
      </p>
      {/* Kept for reference/tests only — not rendered as a link, so it does not create a duplicate
          navigable element; serializeProjectDetailHash is exercised via onOpenProject instead. */}
    </section>
  );
}
