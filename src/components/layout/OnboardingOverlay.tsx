import { useEffect, useRef, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';

const STORAGE_KEY = 'daklak-dashboard:onboarding-dismissed';

function hasSeenOnboarding() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function OnboardingOverlay() {
  const [open, setOpen] = useState(() => !hasSeenOnboarding());
  const previousFocus = useRef<HTMLElement | null>(null);
  const helpSignal = useMapStore((state) => state.helpSignal);
  const viewMode = useMapStore((state) => state.viewMode);
  const isDetailMap = viewMode === 'map';
  const previousHelpSignal = useRef(helpSignal);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Private browsing can disable storage; dismissal still works for this session.
    }
    setOpen(false);
    requestAnimationFrame(() => {
      const target = previousFocus.current?.isConnected
        ? previousFocus.current
        : document.getElementById('map-viewport');
      target?.focus();
    });
  };

  useEffect(() => {
    if (previousHelpSignal.current === helpSignal) return;
    previousHelpSignal.current = helpSignal;
    previousFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, [helpSignal]);

  useEffect(() => {
    if (!open) return;
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', closeWithKeyboard);
    return () => window.removeEventListener('keydown', closeWithKeyboard);
  }, [open]);

  if (!open) return null;

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section
        className="onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <p className="eyebrow">KHÁM PHÁ ĐẮK LẮK 2025</p>
        <h2 id="onboarding-title">
          {isDetailMap
            ? '102 xã, phường trên bản đồ chi tiết'
            : '102 xã, phường trong một bản đồ tương tác'}
        </h2>
        <p>Chọn một khu vực để xem hồ sơ nhanh, hoặc mở danh sách 2D để tìm bằng tên và mã.</p>
        {isDetailMap ? (
          <ul>
            <li>
              <strong>Kéo</strong> để di chuyển bản đồ
            </li>
            <li>
              <strong>Cuộn hoặc chụm</strong> để thu phóng
            </li>
            <li>
              <strong>Lớp bản đồ</strong> để bật/tắt từng lớp hiển thị
            </li>
          </ul>
        ) : (
          <ul>
            <li>
              <strong>Kéo</strong> để xoay góc nhìn
            </li>
            <li>
              <strong>Cuộn hoặc chụm</strong> để thu phóng
            </li>
            <li>
              <strong>Chạm</strong> một khu vực để xem chi tiết
            </li>
          </ul>
        )}
        <button type="button" autoFocus onClick={dismiss}>
          Bắt đầu khám phá
        </button>
        <small>Dữ liệu chuyên đề là dữ liệu minh họa; bản đồ không phải hồ sơ pháp lý.</small>
      </section>
    </div>
  );
}
