import { useEffect, useRef, type RefObject } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { formatKpiValue } from './model/executiveOverviewSelectors';
import type { ProjectAttentionItem } from './model/executiveOverviewTypes';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Panel tóm tắt một dự án — KHÔNG phải full Project Detail route (spec Phase 2A loại trừ tường
 * minh "full Project Detail page"). Cùng pattern modal/focus-trap với `DataProvenancePanel.tsx`
 * (backdrop, Escape đóng, Tab wrap, trả focus khi đóng) để giữ nhất quán hành vi accessibility
 * trong toàn app thay vì phát minh lại.
 */
export function ProjectSummaryPanel({
  item,
  asOf,
  onClose,
  restoreFocusTo,
}: {
  item: ProjectAttentionItem;
  asOf: Date;
  onClose: () => void;
  /** Ref to the element to refocus on close, captured by the caller at click time — see the effect
   * below for why this can't reliably be inferred from `document.activeElement` inside this
   * component. A ref (read inside an effect), not the element itself, so this component never
   * reads `.current` during render. */
  restoreFocusTo: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const setDetailMapCamera = useMapStore((state) => state.setDetailMapCamera);
  const disbursement = formatKpiValue(item.disbursementRate);
  const canViewOnMap = item.geometry?.type === 'Point';

  useEffect(() => {
    // Captured by the caller (PriorityProjectList), not via `document.activeElement` here: by the
    // time this effect runs, the close button's `autoFocus` has already moved focus away from
    // whatever triggered the open (React applies autoFocus during the commit/layout phase, before
    // this passive effect fires) — reading `document.activeElement` at this point would capture
    // the dialog's own close button instead of the real trigger. Read once now (not in the
    // cleanup) since the ref's `.current` could point elsewhere by the time cleanup runs.
    const target = restoreFocusTo.current;
    return () => {
      if (target?.isConnected) target.focus();
    };
  }, [restoreFocusTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const viewOnMap = () => {
    if (!canViewOnMap || item.geometry?.type !== 'Point') return;
    const [longitude, latitude] = item.geometry.coordinates;
    setDetailMapCamera({ latitude, longitude, zoom: 13, bearing: 0, pitch: 0 });
    setViewMode('map');
  };

  return (
    <div
      className="project-summary-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="project-summary-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-summary-title"
        ref={panelRef}
      >
        <div className="project-summary-card__header">
          <h2 id="project-summary-title">{item.projectName}</h2>
          <button type="button" autoFocus onClick={onClose} aria-label="Đóng tóm tắt dự án">
            Đóng
          </button>
        </div>
        <dl>
          <div>
            <dt>Mã dự án</dt>
            <dd>{item.projectCode}</dd>
          </div>
          <div>
            <dt>Lĩnh vực</dt>
            <dd>{item.sector}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>{item.statusLabel}</dd>
          </div>
          <div>
            <dt>Tiến độ khối lượng</dt>
            <dd>{item.overallProgress}%</dd>
          </div>
          <div>
            <dt>Tỷ lệ giải ngân</dt>
            <dd>{disbursement.text}</dd>
          </div>
          <div>
            <dt>Lý do cần chú ý</dt>
            <dd>{item.primaryReason}</dd>
          </div>
          <div>
            <dt>Địa bàn</dt>
            <dd>{item.administrativeAreaCodes.join(', ') || 'Chưa gán địa bàn cụ thể'}</dd>
          </div>
          <div>
            <dt>Dữ liệu cập nhật lúc</dt>
            <dd>{new Date(item.dataUpdatedAt).toLocaleDateString('vi-VN')}</dd>
          </div>
        </dl>
        {canViewOnMap ? (
          <button type="button" onClick={viewOnMap} className="project-summary-card__map-action">
            Xem trên bản đồ
          </button>
        ) : (
          <p className="project-summary-card__no-geometry">
            Dự án này chưa có toạ độ để hiển thị trên bản đồ.
          </p>
        )}
        <p className="project-summary-card__mock-notice">
          DỮ LIỆU MINH HỌA — tính đến {asOf.toLocaleDateString('vi-VN')}, không dùng cho quyết định
          quản lý thực tế.
        </p>
      </section>
    </div>
  );
}
