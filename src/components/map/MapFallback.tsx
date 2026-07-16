import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Không thể khởi tạo bản đồ 3D', error, info);
  }

  render() {
    if (this.state.failed) {
      return <MapFallback reason="Bản đồ 3D gặp lỗi khi tải dữ liệu hoặc khởi tạo đồ họa." />;
    }
    return this.props.children;
  }
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Không thể khởi tạo dashboard', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-fallback" role="alert">
          <h1>Dashboard gặp lỗi</h1>
          <p>Không thể đọc cấu hình hoặc dữ liệu của ứng dụng.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Thử tải lại
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

export function MapFallback({
  reason,
  actionLabel = 'Thử tải lại',
  onRetry = () => window.location.reload(),
}: {
  reason: string;
  actionLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="map-fallback" role="alert">
      <span aria-hidden="true">◇</span>
      <h2>Không thể hiển thị bản đồ 3D</h2>
      <p>{reason}</p>
      <button type="button" onClick={onRetry}>
        {actionLabel}
      </button>
    </div>
  );
}

export function MapLoading() {
  return (
    <div className="map-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      Đang tải địa hình và lớp bản đồ…
    </div>
  );
}
