import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithI18n as render } from '../../i18n/tests/renderWithI18n';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PanoramaViewer } from './PanoramaViewer';

vi.mock('@react-three/fiber', async () => {
  const React = await import('react');
  return {
    Canvas: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'canvas' }, children),
  };
});
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null }));

const panorama = {
  file: 'a.jpg',
  attribution: 'Tác giả thử',
  license: 'CC BY 4.0',
  sourceUrl: 'https://example.org/p',
};

describe('PanoramaViewer', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(cleanup);

  it('shows the canvas, attribution, licence and source link, and closes on request', () => {
    const onClose = vi.fn();
    render(<PanoramaViewer panorama={panorama} name="Hồ Lắk" onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: /360° thật — Hồ Lắk/i })).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByText(/Tác giả thử/)).toBeInTheDocument();
    expect(screen.getByText(/CC BY 4\.0/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nguồn ảnh/i })).toHaveAttribute(
      'href',
      'https://example.org/p',
    );
    fireEvent.click(screen.getByRole('button', { name: /đóng 360°/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
