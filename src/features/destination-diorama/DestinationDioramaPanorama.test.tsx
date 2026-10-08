import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithI18n as render } from '../../i18n/tests/renderWithI18n';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DestinationDioramaView } from './DestinationDioramaView';

vi.mock('../../components/map/webglLifecycle', () => ({ hasWebGLSupport: () => true }));
vi.mock('./dioramaRegistry', async () => ({
  DIORAMA_SCENES: new Proxy({}, { get: () => () => null, has: () => true }),
}));
vi.mock('./panoramas', () => ({
  destinationPanorama: (id: string) =>
    id === 'ho-lak'
      ? {
          file: 'ho-lak.jpg',
          attribution: 'Tác giả thử',
          license: 'CC BY 4.0',
          sourceUrl: 'https://example.org/p',
        }
      : undefined,
  panoramaUrl: (file: string) => `/panoramas/${file}`,
}));
vi.mock('./PanoramaViewer', () => ({
  PanoramaViewer: ({ name, onClose }: { name: string; onClose: () => void }) => (
    <div role="dialog" aria-label={`pano ${name}`}>
      <button onClick={onClose}>đóng</button>
    </div>
  ),
}));

describe('360° entry in the diorama view', () => {
  afterEach(cleanup);

  it('offers the 360° photo only when the destination has one, and can open and close it', async () => {
    render(<DestinationDioramaView destinationId="ho-lak" onBack={vi.fn()} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /360°/ }));
    expect(await screen.findByRole('dialog', { name: /pano/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'đóng' }));
    expect(screen.queryByRole('dialog', { name: /pano/ })).not.toBeInTheDocument();
  });

  it('shows no 360° button for a destination without a panorama', () => {
    render(
      <DestinationDioramaView destinationId="thac-thuy-tien" onBack={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /360°/ })).not.toBeInTheDocument();
  });
});
