import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { useMapStore } from './stores/mapStore';
import { I18nProvider } from './i18n/I18nProvider';

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

// Real dynamic import() resolution time is not guaranteed to fit RTL's default 1000ms waitFor
// window under load (e.g. the full suite transforming many files concurrently) — these lazy
// chunks are tiny, but give them real headroom rather than flaking.
const LAZY_CHUNK_TIMEOUT = { timeout: 5000 };

/**
 * DetailMapViewport and DataProvenancePanel are both React.lazy boundaries (see App.tsx) — these
 * tests exercise the actual dynamic import()/Suspense wiring, not a mocked stand-in, since the
 * whole point is proving the lazy-mount + store-boolean approach doesn't race a click. WebGL is
 * unavailable in jsdom by design (no real GPU), so the detail map and 3D overview both render
 * their documented graceful-fallback UI here rather than mounting Three.js/MapLibre — that's
 * exactly the same environment-driven fallback path already covered by MapViewport.test.tsx.
 */
describe('App', () => {
  beforeEach(() => {
    useMapStore.setState({
      viewMode: '3d',
      provenancePanelOpen: false,
      selectedCode: null,
      dataMode: 'overview',
    });
    // jsdom has no real prefers-reduced-motion media query support.
    window.matchMedia =
      window.matchMedia ??
      ((query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList);
  });
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('does not render the data provenance dialog on initial mount', () => {
    renderApp();
    expect(
      screen.queryByRole('dialog', { name: 'Nguồn và chất lượng dữ liệu' }),
    ).not.toBeInTheDocument();
  });

  it('opens the data provenance panel after its lazy chunk resolves, once the header button is clicked', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Xem nguồn và chất lượng dữ liệu' }));
    expect(
      await screen.findByRole(
        'dialog',
        { name: 'Nguồn và chất lượng dữ liệu' },
        LAZY_CHUNK_TIMEOUT,
      ),
    ).toBeInTheDocument();
  });

  it('never renders more than one provenance dialog even if the open action fires more than once', async () => {
    renderApp();
    act(() => useMapStore.getState().openProvenancePanel());
    act(() => useMapStore.getState().openProvenancePanel());
    await screen.findByRole('dialog', { name: 'Nguồn và chất lượng dữ liệu' }, LAZY_CHUNK_TIMEOUT);
    expect(screen.getAllByRole('dialog', { name: 'Nguồn và chất lượng dữ liệu' })).toHaveLength(1);
  });

  it('does not open the provenance panel on a Back/Forward (popstate) navigation', async () => {
    renderApp();
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Give any (incorrect) async open a chance to happen before asserting it didn't.
    await Promise.resolve();
    expect(
      screen.queryByRole('dialog', { name: 'Nguồn và chất lượng dữ liệu' }),
    ).not.toBeInTheDocument();
    expect(useMapStore.getState().provenancePanelOpen).toBe(false);
  });

  it('mounts the detail map boundary only once viewMode becomes "map"', async () => {
    renderApp();
    expect(
      screen.queryByText(/không hỗ trợ WebGL nên không thể mở bản đồ chi tiết/),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở bản đồ chi tiết' }));
    expect(
      await screen.findByText(
        /không hỗ trợ WebGL nên không thể mở bản đồ chi tiết/,
        {},
        LAZY_CHUNK_TIMEOUT,
      ),
    ).toBeInTheDocument();
  });
});
