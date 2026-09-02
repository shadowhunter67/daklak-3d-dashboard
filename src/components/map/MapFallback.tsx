import { Component, type ErrorInfo, type ReactNode } from 'react';
import { tStatic } from '../../i18n/staticTranslate';

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
      return <MapFallback reason={tStatic('errorBoundary.map3dDefaultReason')} />;
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
          <h1>{tStatic('errorBoundary.dashboardHeading')}</h1>
          <p>{tStatic('errorBoundary.dashboardBody')}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {tStatic('errorBoundary.reload')}
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

export function MapFallback({
  reason,
  actionLabel,
  onRetry = () => window.location.reload(),
  children,
}: {
  reason: string;
  actionLabel?: string;
  onRetry?: () => void;
  /** Optional content rendered below the retry button — e.g. `AccessibleDirectory`, so a viewer
   * without WebGL (or hitting a map error) still gets a working, map-free way to browse the 102
   * ward/commune units right where the map would have been, instead of being sent to a separate
   * view. */
  children?: ReactNode;
}) {
  return (
    <div className="map-fallback" role="alert">
      <span aria-hidden="true">◇</span>
      <h2>{tStatic('errorBoundary.map3dHeading')}</h2>
      <p>{reason}</p>
      <button type="button" onClick={onRetry}>
        {actionLabel ?? tStatic('errorBoundary.reload')}
      </button>
      {children}
    </div>
  );
}

export function MapLoading() {
  return (
    <div className="map-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      {tStatic('mapLoading.text')}
    </div>
  );
}
