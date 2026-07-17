import { lazy, Suspense, useEffect, useReducer, useRef } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { DetailPanel } from '../dashboard/DetailPanel';
import { initialMobileSheet, reduceMobileSheet } from './mobileSheet';

const StatPanel = lazy(() =>
  import('../dashboard/StatPanel').then((module) => ({ default: module.StatPanel })),
);

export function MobileDashboardSheet() {
  const selectedCode = useMapStore((state) => state.selectedCode);
  const select = useMapStore((state) => state.select);
  const [sheet, dispatch] = useReducer(reduceMobileSheet, initialMobileSheet);
  const previousSelection = useRef<string | null>(null);

  useEffect(() => {
    if (selectedCode && selectedCode !== previousSelection.current) dispatch({ type: 'select' });
    if (!selectedCode && previousSelection.current) dispatch({ type: 'clear-selection' });
    previousSelection.current = selectedCode;
  }, [selectedCode]);

  useEffect(() => {
    window.dispatchEvent(new Event('dashboard-insets-change'));
  }, [sheet.state]);

  const selection = sheet.content === 'selection' && selectedCode;
  const title = selection ? 'Chi tiết đơn vị đã chọn' : 'Tóm tắt dữ liệu';

  return (
    <aside
      id="mobile-dashboard-sheet"
      className={`mobile-sheet mobile-sheet--${sheet.state}`}
      aria-label={title}
      data-state={sheet.state}
      data-viewport-overlay="bottom"
    >
      <div className="mobile-sheet__bar">
        <button
          type="button"
          className="mobile-sheet__toggle"
          aria-expanded={sheet.state === 'expanded'}
          aria-controls="mobile-sheet-content"
          onClick={() =>
            dispatch(sheet.state === 'closed' ? { type: 'show-summary' } : { type: 'toggle' })
          }
        >
          <span className="mobile-sheet__handle" aria-hidden="true" />
          <span>{sheet.state === 'closed' ? 'Mở tóm tắt' : title}</span>
        </button>
        {sheet.state !== 'closed' && (
          <button
            type="button"
            className="mobile-sheet__close"
            aria-label={selection ? 'Đóng chi tiết và bỏ chọn đơn vị' : 'Đóng bảng tóm tắt'}
            onClick={() => {
              if (selection) select(null);
              else dispatch({ type: 'close' });
            }}
          >
            ×
          </button>
        )}
      </div>
      <div id="mobile-sheet-content" className="mobile-sheet__content">
        <Suspense fallback={null}>{selection ? <DetailPanel /> : <StatPanel />}</Suspense>
      </div>
    </aside>
  );
}
