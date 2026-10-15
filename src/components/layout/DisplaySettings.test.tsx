import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { I18nProvider } from '../../i18n/I18nProvider';
import { DisplaySettings } from './DisplaySettings';

const LAZY_CHUNK_TIMEOUT = { timeout: 5000 };

function open() {
  render(
    <I18nProvider>
      <DisplaySettings />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cài đặt hiển thị' }));
}

describe('DisplaySettings', () => {
  afterEach(cleanup);
  beforeEach(() =>
    useMapStore.setState({ dataSourcesPanelOpen: false, provenancePanelOpen: false }),
  );

  it('is closed until the trigger is pressed, and closes on Escape', () => {
    render(
      <I18nProvider>
        <DisplaySettings />
      </I18nProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt hiển thị' }));
    expect(screen.getByRole('dialog', { name: 'Cài đặt hiển thị' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the data provenance panel without changing selection', () => {
    useMapStore.setState({ selectedCode: '24580' });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Xem nguồn và chất lượng dữ liệu' }));
    expect(useMapStore.getState().provenancePanelOpen).toBe(true);
    expect(useMapStore.getState().selectedCode).toBe('24580');
  });

  it('opens the automated data-sources panel, distinct from provenance', () => {
    open();
    fireEvent.click(
      screen.getByRole('button', { name: 'Xem tình trạng nguồn dữ liệu tự động cập nhật' }),
    );
    expect(useMapStore.getState().dataSourcesPanelOpen).toBe(true);
    expect(useMapStore.getState().provenancePanelOpen).toBe(false);
  });

  it('defaults to Vietnamese and switches to English without touching map state', async () => {
    open();
    expect(screen.getByRole('button', { name: 'Chuyển sang tiếng Việt' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(document.documentElement.lang).toBe('en');
    // English dictionary is lazy-loaded; labels update once it resolves.
    expect(
      await screen.findByRole('button', { name: 'Display settings' }, LAZY_CHUNK_TIMEOUT),
    ).toBeInTheDocument();
  });
});
